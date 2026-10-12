# Neon Auth implementation plan

## Objective

Move identity, sessions, and sign-in flows from the current local password hash and application-issued JWT to Neon Auth. Keep ABC-specific authorization (school membership, role, account status, and resource permissions) in the application database.

This is a migration plan. The current sign-in flow remains in place until the cutover checklist is complete.

## Current state

- The application has an `users` table containing email, name, role, status, and a local `password_hash`.
- Express currently verifies that password and creates an HS256 JWT with `JWT_SECRET`.
- The frontend keeps that token in browser storage and sends it as a bearer token.
- The configured superadmin exists, is active, and the configured seed password matches its stored bcrypt hash.

## Target design

Neon Auth owns credentials, identity verification, password reset, and sessions. It stores its managed identity data in the `neon_auth` schema. The application owns its domain profile:

```text
neon_auth user ── auth subject ──> app users profile ──> school role and permissions
```

The app profile should use an immutable Neon Auth subject as its primary linkage, for example `auth_user_id`. Email is only a migration and display attribute; it must not be the long-term authorization key.

## Phase 1 — provision and configuration

1. Enable Neon Auth on the production Neon project and on the development/staging branch used for this application.
2. Register the local, staging, and production application origins with Neon Auth. Restrict redirects to the exact expected origins.
3. Standardize server configuration on these names:

   - `NEON_AUTH_BASE_URL`
   - `NEON_AUTH_JWKS_URL`
   - `VITE_NEON_AUTH_BASE_URL` for the public client endpoint only

4. Keep `DATABASE_URL`, `JWT_SECRET`, and all cloud credentials server-only. Do not expose database credentials or the old application signing secret to Vite.
5. Validate the issuer, audience, and key rotation behavior against the JWKS endpoint before enabling any production traffic.

## Phase 2 — data model and migration preparation

1. Add nullable `auth_user_id` to the application `users` profile and give it a unique constraint.
2. Preserve existing `role`, `status`, school linkage, and audit fields in the app table.
3. Create a migration ledger containing each current account email, expected role, creation result, Neon subject, and review status. Treat duplicate or changed email addresses as manual review items.
4. Back up the current users table and test the migration on a disposable Neon branch first.
5. Do not remove `password_hash` during this phase. It is needed only for rollback while the migration is being verified.

## Phase 3 — frontend authentication

1. Add Neon’s supported JavaScript auth client and create a single `src/features/auth/lib/neon-auth.js` wrapper.
2. Replace direct calls to `/api/auth/login` and `/api/auth/register` with the Neon Auth client’s sign-in and sign-up methods.
3. Keep the present login and registration design, including pending, error, password visibility, accessibility labels, and the post-login role redirect.
4. Make the auth provider hydrate the Neon session before rendering protected routes. It must render a loading state until that check finishes.
5. Obtain an access token from the Neon session only when calling the API. Do not persist raw credentials or implement a second client-side session format.
6. Add sign-out, expired-session handling, verification-email guidance, and password-reset screens using Neon Auth’s supported flows.

## Phase 4 — Express authorization

1. Replace the local username/password endpoints with a verification middleware for Neon-issued access tokens.
2. Fetch signing keys from `NEON_AUTH_JWKS_URL`, cache them, and verify signature, expiry, issuer, and audience for every protected request.
3. Use the verified Neon subject to load the application profile. Reject requests with no mapped profile, an inactive profile, or an unauthorized role.
4. Build `req.user` only from verified token claims plus the server-loaded profile. Never accept role, school, or status from the browser.
5. Retire `/api/auth/login` and `/api/auth/register` after all clients have migrated. Keep `/api/auth/me` as a profile/session projection backed by Neon identity.

## Phase 5 — database authorization

1. Decide whether the API will continue to use a restricted direct Postgres role or move sensitive browser-originated reads to Neon’s Data API with the Neon access token.
2. Define row-level security policies for school ownership and user roles, beginning with children, guardians, attendance, invoices, and messages.
3. Test every role against both API checks and database policies. The UI is never the authorization boundary.
4. Maintain server-only operations under a dedicated least-privilege database role and log those actions.

## Phase 6 — rollout

1. Deploy the schema migration and Neon configuration without switching traffic.
2. Run the account migration in staging, verify every role, then review exceptions.
3. Invite or create Neon Auth accounts for existing users and link each verified subject to its profile.
4. Release frontend Neon Auth support behind a feature flag, then release server token verification.
5. Force a fresh login only after observing successful sign-ins, token refreshes, redirects, and role loading in production.
6. After the rollback window expires, remove local password verification, the old JWT issuer, `JWT_SECRET`, and `password_hash` through a separate reviewed migration.

## Required acceptance tests

- Superadmin sign-in redirects to `/dashboard/superadmin`.
- Each supported role redirects only to its own dashboard.
- An unauthenticated request redirects to login and cannot read protected API data.
- An inactive mapped profile is denied even with a valid Neon session.
- A token from the wrong issuer, audience, or expired key is denied.
- Session restore, sign-out, password reset, email verification, and token refresh work in local, staging, and production origins.
- Database policies deny cross-school access when exercised outside the frontend.

## Rollback

Keep the existing local-auth code and encrypted database backup until the monitored cutover period ends. Roll back by disabling the Neon Auth feature flag and restoring the local middleware only if the profile-link migration remains intact and no account data was lost. Do not run a destructive identity cleanup during the rollout window.

## References

- [Neon Auth overview](https://neon.com/blog/neon-auth-branchable-identity-in-your-database)
- [Neon Auth staging environments](https://neon.com/blog/handling-auth-in-a-staging-environment)
- [Neon JWT and JWKS guidance](https://neon.com/blog/wtf-are-jwts)
