# Security hardening report

Date: 2026-10-12

## Completed

| Area | Status | Evidence |
| --- | --- | --- |
| Server-side authentication | DONE | JWT fallback secret removed; algorithm, issuer, audience, active account, first-login state, and session version are enforced in `server/middleware/auth.middleware.js`. |
| Session cookies | DONE | Browser tokens moved out of Web Storage into HttpOnly, SameSite=Strict cookies; production cookies use Secure; state-changing cookie requests enforce trusted origin. |
| Session revocation | DONE | Migration `0016_session_revocation.sql` adds `session_version`; password changes invalidate older tokens. |
| Passwords | DONE | Registration/change passwords require 12+ characters; predictable `1234` credentials were replaced with per-account CSPRNG temporary passwords; first-login accounts are blocked server-side until password change. |
| Verification codes | DONE | Codes are stored as HMAC-SHA256 digests and compared with a timing-safe comparison. |
| Superadmin protection | DONE | `/api/superadmin/users` now has prefix-level `superadmin` authorization. |
| Tenant association checks | DONE | Course subjects/teachers and failed-result decision subjects are checked against the authenticated school and parent record. |
| Request validation | DONE | Strict student schemas, JSON-only mutation bodies, unsafe prototype-key rejection, control-character rejection, URL/complexity limits, and existing Zod validation are enforced. |
| SQL injection | DONE | Audit found no request-derived raw SQL; Drizzle query builders and tagged parameterized SQL remain in use. |
| CORS and headers | DONE | Exact origin allowlist, credentials policy, explicit methods/headers, CSP, HSTS in production, no-sniff, frame deny, referrer, permissions, COOP, and CORP headers added. |
| Rate limiting / basic bot defense | DONE | Global API and per-auth-route IP/path rate limits, standard rate-limit headers, and Retry-After were added. |
| XSS | DONE | No `dangerouslySetInnerHTML`, `eval`, or document-write sink was found; React escaping remains the rendering boundary and API CSP is restrictive. |
| File selection | DONE | Current UI-only file selection restricts MIME types and size to 5 MB. There is no server upload endpoint. |
| API response minimization | DONE | Password hashes, verification fields, and session versions are excluded from user responses; production login responses no longer expose bearer tokens. |
| Environment / debug | DONE | Production mode requires HTTPS origins and TLS for remote PostgreSQL; production stack traces are disabled; seed passwords shorter than 12 characters are rejected. `.env` permissions changed from 0664 to 0600. |
| Dependencies | DONE | React Router upgraded to 7.18.4; server patch releases updated; unused `express-jwt` and `jwks-rsa` removed; production `npm audit` reports 0 vulnerabilities. |
| Secret history check | DONE | `.env` is ignored and untracked. The parent Git repository has no commit history for `abc/`, so there is no project history to rewrite. Placeholder-only scans outside `.env` found no embedded application secret. |
| Verification | DONE | `npm test` 6/6 suites passed; `npm run check` passed; production build passed. |

## Deployment actions that cannot be completed from source code alone

These are explicit operational blockers, not skipped code fixes:

1. **Rotate external credentials.** The local `.env` contains configured database, AWS, SMTP, and payment credentials. Their values were not printed or copied. Rotate them in each provider, update the deployment secret manager, and remove unused AWS/AUTH/JWKS entries. Source code cannot revoke provider credentials.
2. **Set production environment values.** Set `NODE_ENV=production`, HTTPS `CLIENT_ORIGIN`/`PUBLIC_APP_URL`, a remote `DATABASE_URL` with `sslmode=verify-full` (or the provider-supported strict TLS mode), and `TRUST_PROXY=true` only behind exactly one trusted reverse proxy. The currently configured seed password is shorter than policy and will be rejected by the seed command; replace it before seeding.
3. **PostgreSQL RLS needs a separate least-privileged runtime role and request-scoped DB context.** This app currently connects through one owner-style URL and does not set transaction-local school/user context. Enabling `FORCE ROW LEVEL SECURITY` now would either lock out the application or create a permissive policy that provides no protection. Provision a non-owner runtime role first, then wrap every request in a transaction that sets `SET LOCAL app.school_id` and `app.user_id`; only then add and enable tenant policies. Do not expose a “public DB key”: direct Neon/PostgreSQL has no safe browser key in this architecture.
4. **Distributed bot defense.** The implemented limiter is correct for one process. Multi-instance production needs Redis-backed counters and edge protection such as Turnstile/WAF; that requires external infrastructure and keys.
5. **PII encryption at rest.** Verification secrets and passwords are hashed, and production DB TLS is enforced. Student PII still depends on provider disk encryption. Field-level KMS envelope encryption requires selecting a KMS, provisioning keys, defining searchable-field behavior, and running a controlled data migration.
6. **Real uploads.** No bytes are uploaded today—only validated local filenames are recorded. If actual uploads are added, use private object storage, random keys, magic-byte validation, antivirus scanning, ownership checks, and attachment-only downloads.

## Residual dependency note

The full audit includes four moderate development-only findings inherited by `drizzle-kit` through an old nested esbuild loader. npm proposes downgrading `drizzle-kit` to 0.18.1, which is not a safe remediation for this project. Production dependencies have zero known vulnerabilities; keep the migration CLI out of production images and update it when its upstream dependency chain is fixed.
