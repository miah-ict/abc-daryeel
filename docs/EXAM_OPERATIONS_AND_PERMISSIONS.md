# Exam Operations, Permissions, Audit, and Rollout Contract

Status: **Wave 1 research/specification — manager review required**  
Owner: **RES-05 / Research and Gap Analysis 5**  
Scope: exam/onboarding/template/course permissions, audit evidence and retention, staged rollout/feature flags, migration backup/restore, stop conditions, telemetry, operational recovery, and tabletop scenarios. This document does not change product code.

## 1. Decision notation

- **FACT** — evidenced by repository code or committed operating documentation.
- **RECOMMENDED DEFAULT** — proposed safe operating behavior; it is not an approved product decision.
- **PENDING STAKEHOLDER DECISION** — requires a named approver before implementation or rollout.

Recommended defaults must not be silently promoted into product behavior. Manager confirmation is required at each rollout gate.

## 2. Evidence-backed operational baseline

### Authentication and authorization

- **FACT:** the API verifies locally issued HS256 JWTs with issuer `abc-daycare` and audience `abc-web`, then reloads the user on every request and rejects inactive/missing users (`server/middleware/auth.middleware.js`).
- **FACT:** roles are `superadmin`, `admin`, `manager`, `teacher`, `student`, `accountant`, `guard`, `cleaner`, `cooking`, `driver`, and `ict`. There is no `guardian` role; guardian-facing accounts use `student` and linked children.
- **FACT:** authorization is route-level `allow(...)` plus route-specific ownership checks. There is no declarative permission store or per-action grant model.
- **FACT:** current exam routes allow admin, manager, teacher, and student at the router boundary. Mutations are mostly admin-only; teachers can save/submit only assigned mark sheets; managers can read exam/assignment/result/course data; students can read linked published results.
- **FACT:** current academic-year writes are admin-only. Current class and user administration routes also allow manager mutations, which is broader than manager's exam permissions and needs an explicit target decision.
- **FACT:** finance routes allow accountant and superadmin, but `financeSchoolId` requires the acting account to have a school. Admin cannot post payments/refunds under the current contract.
- **FACT:** `/api/superadmin/logs` returns the global system log to superadmin. The finance audit endpoint is school-scoped and finance-only. There is no school-admin exam-audit endpoint.

### Audit behavior

- **FACT:** `system_logs` stores only ID, actor, optional school, action, free-text detail, and timestamp. It has no entity type/ID fields, request/correlation ID, reason column, before/after snapshot, outcome, IP/session metadata, or retention marker (`server/db/schema/workspace.js`).
- **FACT:** canonical writes using `mutate(...)` write the audit record in the same transaction and advance one global workspace revision.
- **FACT:** several exam writes insert logs inside their database transaction, but reopen, cancel, failed-decision, and manual course-enroll flows perform mutation and audit as separate operations. An audit failure can therefore occur after a successful mutation.
- **FACT:** there is no committed audit retention/deletion policy and no archival job.

### Deployment, migration, backup, and monitoring

- **FACT:** migrations are committed SQL under `server/db/migrations`; `npm run db:migrate` uses Drizzle and the configured PostgreSQL URL. Tests apply every SQL migration in lexical order to embedded PostgreSQL.
- **FACT:** README requires backup and migration-history reconciliation before live migration, warns against blind `db:push`, and recommends testing on a disposable database first.
- **FACT:** database recovery is delegated to Neon backups; the in-app superadmin export is explicitly not a full database backup.
- **FACT:** no CI workflow, deployment manifest, feature-flag framework, telemetry exporter, alert configuration, or automated restore script is committed.
- **FACT:** production instructions are generic: build `dist`, serve with SPA fallback, run the API behind HTTPS, route `/api` on the same public origin, and use a separate production database/secret.
- **FACT:** API startup logs a failed initial database probe as a warning and still starts; `/api/health` performs a live query.
- **FACT:** `.env.example` currently contains a malformed duplicated `DATABASE_URL=DATABASE_URL=...` sample and should not be treated as deployment-ready evidence.

## 3. Target permission principles

**RECOMMENDED DEFAULTS:**

1. Deny by default; authorize both role and school/object relationship on every request.
2. Academic administration belongs to school admin. Manager is read/review by default and receives only explicitly approved confirmation actions.
3. Teacher access is limited to assigned sessions/classes/subjects and does not grant access to unrelated student results.
4. The `student` role is context-sensitive: a self-linked learner may see/act for self; a parent-linked account may see/act only for linked children. The API determines this relationship.
5. Accountant owns financial posting, receipts, waivers if approved, and refunds. Academic roles consume derived status and cannot forge payment.
6. Superadmin has platform visibility but no implicit school academic mutation. Cross-school support requires an explicit, time-bound break-glass mechanism; ordinary superadmin accounts without school scope do not masquerade as school admins.
7. High-risk transitions require a reason, fresh server-side prerequisites, a review/confirmation screen, and an atomic audit event.
8. Published academic and posted financial history is corrected through superseding events/reopen-and-republish policy, never destructive update/delete.

## 4. Role/action matrix

Legend: `M` mutate/execute; `R` read; `O` own-assignment/own-linked-record only; `C` explicit confirmation/review only; `—` denied. “Guardian” below is an actor context within current `student` role, not a repository RBAC role.

| Action | Superadmin | Admin | Manager | Teacher | Learner | Guardian context | Accountant | Recommended guard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View onboarding/settings status | R (support metadata) | R | R | — | — | — | — | Same-school scope; no unpublished student data. |
| Save onboarding draft | — | M | — | — | — | — | — | Admin + school; policy/version validation. |
| Complete/reopen onboarding | — | M | C if governance requires | — | — | — | — | Reason for reopen; no closed-year rewrite. |
| View progression/pass rules/templates | R (support metadata) | R | R | R only frozen assignment rules | — | — | — | Versioned read; minimum necessary fields. |
| Create/edit/archive template | — | M | — | — | — | — | — | New version if used by an exam. |
| Create/cancel exam session | — | M | R; C for configured high-impact cancellation | — | — | — | Reason; frozen template; active year. |
| View all school exam monitoring | — | R | R | O | — | — | — | Teacher sees assigned rows only. |
| Save draft scores | — | M for correction/support only | — | O | — | — | — | Assignment ownership, roster, max, deadline policy. |
| Final-submit scores | — | M for correction/support only | — | O | — | — | — | Complete roster; confirmation; idempotent lock. |
| Reopen submitted sheet | — | M | C optional | — | — | — | — | Mandatory reason; not after publish without approved correction workflow. |
| Publish/cancel published result | — | M | C recommended for bulk/high-impact publish | — | — | — | — | 100% complete, preview/checksum, reason for cancellation/correction. |
| View unpublished detailed results | — | R | R | O | — | — | — | Need-to-know and school scope. |
| View published result | R only in explicit support scope | R | R | O | O | O | — | Learner/guardian link proven server-side. |
| Set Repeat/Re-exam/Special review | — | M | C optional | — | — | — | — | Failed result only; reason; policy version. |
| Create/publish re-exam | — | M | R/C | O score entry | O published result | O linked published result | — | Preserve original attempt. |
| Create/open/start/complete/cancel course | — | M | R; C for running cancellation | — | — | — | R finance fields only | Approved `RES-04` lifecycle. |
| Issue automatic/manual course offer | — | M | R | — | — | — | — | Published eligibility; manual reason; no bypass. |
| Accept/decline course | — | — | — | — | O only if approved | O linked child | — | Actor relationship and consent policy version. |
| Confirm parent consent | — | — | — | — | — | O linked child | — | No client-supplied guardian authority. |
| View course fee/payment status | R in support scope | R summary | R summary | — | O | O | R | Minimum necessary; no unrelated ledger details. |
| Issue invoice/post payment/waiver/refund | — by default | — | — | — | — | — | M | Existing finance transaction/idempotency/closed-period controls. |
| Apply normal/accelerated promotion | — | M via approved service/event | C recommended for batch | — | — | — | — | One effective transition; active target year/class. |
| Start/close academic year | — | M | C recommended | — | — | — | R | All exam/result/promotion exceptions resolved. |
| View school exam/course audit | R only via explicit support scope | R | R | O events where appropriate | O decision history | O linked decision history | R finance subset | Redact unrelated PII; immutable ordering. |
| Export audit/results | R only via explicit support case | M/R | R if approved | O | O personal | O linked child | R finance subset | Logged export; filter and row-count limit. |
| Correct published academic history | — | M only through approved correction workflow | C mandatory recommended | — | — | — | — | Never direct edit; reason, superseding version, affected-user notice policy. |
| Break-glass school support | M only if explicitly approved | — | — | — | — | — | — | Time-bound grant, ticket/reason, dual approval, complete audit. |

### Permission decisions still pending

| ID | Decision | Recommended default | Approver | Blocks |
| --- | --- | --- | --- | --- |
| P-01 | Can manager mutate classes/users as current routes allow? | Remove broad mutation; grant only named review/confirmation actions. | School governance/product | RBAC hardening |
| P-02 | Must manager confirm publication, running-course cancellation, year transition, and published-result correction? | Yes for bulk publish, running cancellation, year close, and correction. | School owner/academic lead | Confirmation workflow |
| P-03 | Can admin enter/correct teacher scores before submit? | Only explicit correction with reason; no invisible impersonation. | Academic lead | Score API/audit |
| P-04 | Learner self-consent vs guardian-only | Guardian confirmation default; see `COURSE_POLICY_AND_FINANCE_CONTRACT.md`. | Safeguarding/academic lead | Course consent |
| P-05 | Superadmin support scope | No implicit school writes; time-bound break glass only. | Platform security owner | Support tooling |
| P-06 | Who may view/export identifiable school audit data? | Admin/manager school scope; teachers/learners only own event subset; log every export. | Privacy/security owner | Audit API/UI |

## 5. Audit contract

### 5.1 Required audit record

**RECOMMENDED DEFAULT:** introduce or extend a structured append-only audit event with:

- event ID and correlation/request ID;
- occurred-at server timestamp and school/tenant ID;
- actor user ID, role at action time, and support/break-glass grant ID if any;
- action and outcome (`Succeeded`, `Rejected`, `Failed`);
- entity type/ID and parent entity type/ID;
- reason code and free-text reason where required;
- policy/template/config version used;
- minimal before/after diff or immutable result checksum, excluding secrets and unnecessary student/finance data;
- source (`API`, `Migration`, `ScheduledJob`, `Support`);
- idempotency key/source event where relevant;
- client/session metadata only if privacy/security approves it.

Audit insert must be in the same transaction as every successful high-impact mutation. If an event cannot be written, the mutation rolls back. Rejected permission/prerequisite attempts should be captured through a separate reliable security-event path that does not leak request bodies.

### 5.2 Mandatory events

At minimum: onboarding save/complete/reopen; progression/pass-rule/template create/version/archive; exam create/cancel; assignment generation failure; score save (summary only), submit, reopen; publish attempt/success/failure; result correction/supersession; Repeat/Re-exam/Special review; course create/version/open/start/complete/cancel; eligibility run; offer/manual-add; consent/decline/expiry; seat hold/release/waitlist promotion; enrollment/withdrawal; finance link/invoice/payment/waiver/refund reference; normal/accelerated promotion; academic-year start/close; export; break-glass grant/use/revoke; feature-flag change; migration/backfill/reconciliation/cutover/rollback.

Do not log passwords, JWTs, verification codes, raw bulk score payloads, full financial instrument data, or entire student profiles.

### 5.3 Retention and access

**RECOMMENDED DEFAULT pending jurisdiction/privacy approval:**

| Record category | Online retention | Archive retention | Rationale |
| --- | --- | --- | --- |
| Published exam/result/promotion/course decisions and their audit trail | Active academic year + 2 years | Minimum 7 academic years total | Supports transcript disputes and promotion history. |
| Financial invoice/payment/refund/course-fee audit | Active fiscal year + 2 years | Minimum 7 fiscal years total | Align operationally with common accounting practice; local law may require different retention. |
| Consent evidence | Course life + 2 years online | Same duration as associated academic decision, recommended 7 years | Proves actor, policy version, and decision. |
| Rejected authorization/security events | 90 days searchable | 1 year archive | Investigation value with reduced privacy exposure. |
| Draft score change summaries | Until publication + 1 year | 2 years unless dispute/legal hold | Avoid indefinite storage of noisy intermediate data. |
| Feature-flag/migration/support break-glass events | 2 years online | 7 years archive | Operational accountability. |

Retention deletion/archival must be tenant-aware, logged, suspended by legal/dispute hold, and tested for referential integrity. **PENDING:** local education, child-data, tax/accounting, and privacy retention requirements; archive encryption/key ownership; data subject access/export/deletion exceptions.

## 6. Feature flags and staged rollout

### 6.1 Flag model

**FACT:** no feature-flag system exists.

**RECOMMENDED DEFAULT:** use both a global emergency kill switch and a server-owned per-school rollout state. Client flags are display aids, never authorization or data-routing authority.

Suggested server states:

```text
Disabled → SchemaReady → ShadowRead → PilotWrite → Enabled → LegacyReadOnly → Retired
                                  ↘ RollbackReadOnly
```

Required controls:

- `global exam_v2 kill switch`: disables new-model mutations while preserving safe reads.
- per-school state and allowlist, changed only by authorized platform rollout actor;
- separate flags for `onboarding/templates`, `exam sessions/results`, and `courses/finance` so course risk cannot enable with basic exams accidentally;
- every flag change records actor, reason, old/new state, timestamp, and rollout ticket;
- API decides the active data path; frontend cannot force-enable it.

### 6.2 Rollout stages and manager gates

| Stage | Work | Exit evidence | Manager gate |
| --- | --- | --- | --- |
| 0 — Contract freeze | Approve `RES-01`–`RES-05`, ERD, API, test/reconciliation plan, named owners. | No unresolved blocking decisions; production-shaped dataset inventory. | G1 contract approval. |
| 1 — Additive schema | Backup; deploy only new tables/nullable columns/indexes that do not change existing reads/writes. | Fresh and upgrade migrations pass; backup ID and restore target recorded. | G2 schema approval. |
| 2 — Backfill/reconcile | Backfill in bounded batches; quarantine ambiguous rows; no destructive cleanup. | Counts/checksums/exception report; zero unexplained loss; performance within budget. | G2 reconciliation approval. |
| 3 — Shadow read/compute | Existing behavior remains authoritative; new service computes assignments/results/promotions without user-visible writes. | Result/assignment diff report meets approved threshold; audit/metrics functioning. | G3 shadow approval. |
| 4 — Pilot write | Enable onboarding/templates/exams for named noncritical school(s); courses/finance remain separately disabled. | Full pilot lifecycle; no P0/P1; restore/correction tabletop passed; support staffed. | G3/G4 pilot approval. |
| 5 — Course pilot | Enable course/consent/finance link only after `RES-04` decisions and finance reconciliation. | Capacity/payment/refund/waitlist scenarios pass; accountant signs finance report. | G4 course approval. |
| 6 — Gradual expansion | Expand allowlist in cohorts with observation windows. | Stable metrics, no unresolved data divergence, support volume acceptable. | Cohort approval each time. |
| 7 — Cutover/legacy read-only | New path authoritative; legacy columns retained read-only through rollback window. | No fallback reads for agreed window; final reconciliation and backup. | G5 production approval. |
| 8 — Retirement | Separate reviewed migration removes legacy only after rollback window. | Legal/retention checks, restore artifact, zero legacy consumers. | Separate destructive-change approval. |

## 7. Backup, restore, and migration procedure

### 7.1 Pre-migration backup

**RECOMMENDED DEFAULT:**

1. Name a migration owner, database owner, rollback commander, application owner, and communications owner.
2. Freeze schema changes and record application commit, migration journal, database project/branch, row-count baseline, and current feature states.
3. Create a provider-backed Neon restore point/branch or equivalent full PostgreSQL snapshot. The exact operation must be validated against the production plan; repository export is not sufficient.
4. Verify backup completion and encryption/access, then perform a restore rehearsal into an isolated database.
5. Run migrations and reconciliation against the restored copy; never test first on production.
6. Confirm backup retention exceeds the rollout and rollback window.
7. Only then schedule additive production migration under write controls.

### 7.2 Production migration

1. Put new-model mutations in Disabled/read-only state; keep existing production path authoritative.
2. Check `/api/health`, database capacity/locks, migration history, storage, replication/branch status, and backup ID.
3. Apply a reviewed, exact migration artifact; do not use `db:push`.
4. Record start/end, applied journal entries, affected-row counts, warnings, and exception rows.
5. Run read-only reconciliation before enabling any flag.
6. Advance only to SchemaReady/ShadowRead; observe before PilotWrite.

### 7.3 Restore and rollback

Use two different responses:

- **Logical rollback:** for application behavior defects without data corruption, disable new writes, switch to `RollbackReadOnly` or prior compatible reads, keep new tables/history, deploy a forward fix, and reconcile. Do not down-migrate or discard valid new writes.
- **Database restore:** only for confirmed corruption/unrecoverable migration failure. Stop all writes, record incident time, preserve the corrupt database for analysis, restore the verified snapshot/branch, point the application only after validation, replay only explicitly reconciled external events, and communicate the data-loss window.

**PENDING:** exact Neon plan capabilities, point-in-time recovery window, RTO, RPO, who can create/promote a restored branch, DNS/connection-string rotation procedure, and whether external payment events need replay.

## 8. Stop conditions

### Before migration: do not start if any is true

- no verified backup ID or successful restore rehearsal;
- migration history does not match the expected journal;
- unresolved class/student/exam ownership or duplicate active enrollment exceptions exceed zero without a signed quarantine plan;
- blocking `RES-01` or `RES-04` decisions remain unresolved for the feature being activated;
- no named rollback commander or communications owner;
- current build/tests fail, database health is degraded, or available capacity is below approved margin;
- audit events/feature-state changes cannot be captured;
- deployment configuration still contains invalid/ambiguous required values.

### During migration/backfill: stop and preserve evidence if

- any destructive/unreviewed DDL appears;
- lock duration, error rate, connection saturation, storage growth, or batch runtime exceeds approved budget;
- row counts/checksums diverge beyond explained quarantines;
- cross-school ownership violation, orphan, duplicate active enrollment, or published-result mutation is detected;
- migration applies out of order or journal state changes unexpectedly.

### Before PilotWrite/Enabled: do not advance if

- shadow assignments/results/promotions differ from approved golden behavior;
- audit gaps, unexplained publish failures, double-promotion attempts, over-capacity events, or finance link mismatches exist;
- any open P0/P1 defect remains;
- recovery tabletop, permission matrix, concurrency tests, or operator training is incomplete;
- user-facing correction path is absent for the states enabled.

### Emergency kill switch triggers

- confirmed cross-school exposure or unauthorized mutation;
- published result calculation divergence affecting any student;
- duplicate/incorrect promotion or class mutation;
- course capacity exceeded;
- course marked Paid without a matching posted finance record, or refund exceeds collection;
- audit mutation succeeds without durable audit evidence;
- sustained error/latency thresholds or migration database health breach.

## 9. Metrics, alerts, and operational dashboards

**FACT:** current repository has no telemetry/alert implementation; historical dashboard data is not production telemetry.

**RECOMMENDED DEFAULT:** metrics are school-safe aggregates with trace IDs, not student names or raw marks. Define exact thresholds from staging/pilot baselines; the values below are starting recommendations.

| Signal | Metric | Starting alert recommendation | Response |
| --- | --- | --- | --- |
| API health | request count/error/latency by route/action/status | Page on >2% 5xx for 5 min or p95 >2 s for 10 min on critical mutations | Freeze expansion; inspect DB/app health. |
| Assignment generation | generated, rejected, missing/ambiguous teacher, duplicate prevented | Any unexplained generation failure; >1% missing-teacher in pilot | Keep session Draft; correct source data. |
| Submission backlog | Draft/Submitted/Late counts and age, deadline proximity | Alert admin at 24h/4h; ops alert if Late > approved baseline | Contact responsible school role; no auto-publish. |
| Score quality | invalid/missing/duplicate/ineligible score rejections | Any post-submit mutation; spike > baseline | Freeze affected assignment/publish. |
| Reopen/correction | reopen count, reason codes, time since submit | Alert on unusually high rate or reopen after publish attempt | Academic review. |
| Publication | attempts/success/failure/duration/result count/checksum | Page on any partial/unknown outcome; alert failure rate >1% | Disable publish for affected school; reconcile. |
| Calculation shadow | old/new outcome, rank, promotion diff | Any unexplained student-level diff blocks pilot | Resolve policy/data discrepancy. |
| Promotion | proposed/applied/duplicate-prevented/missing target | Any applied duplicate or invalid target pages immediately | Kill promotion writes; run recovery. |
| Course capacity | capacity, held, enrolled, waitlisted, contention/release | Any `held + enrolled > capacity` pages immediately | Disable course acceptance; reconcile seats. |
| Consent | offered/accepted/declined/expired/missing guardian link | Missing required consent on enrolled learner pages immediately | Suspend enrollment. |
| Course finance | invoices, settled, partial, overdue, link mismatch, refund queue age | Any Paid-without-posted-record pages; refund queue beyond SLA alerts | Freeze fee-gated enrollment; finance review. |
| Audit | event writes/failures, mutation-to-event correlation gaps, export/break-glass | Any successful high-risk mutation without event pages immediately | Kill related writes; incident process. |
| Migration | batch rows/rate/errors/quarantine/lock time | Any unexplained count divergence or lock budget breach stops migration | Preserve state; rollback commander decides. |

Every alert needs severity, owner, acknowledgement target, escalation path, dashboard/runbook link, and a test signal. **PENDING:** monitoring provider, on-call coverage, thresholds/SLA, privacy review, and notification channels.

## 10. Recovery runbooks

### R-01 — Failed or partial migration

1. Stop migration process and keep feature flags Disabled/SchemaReady.
2. Capture journal state, SQL error, transaction status, locks, counts, and backup ID.
3. If transaction rolled back cleanly, correct the forward migration and retest on restored copy.
4. If partial commits occurred, do not rerun blindly; use the migration-specific reconciliation/idempotency plan.
5. Restore only if corruption is confirmed and forward repair is unsafe.
6. Manager receives impact/reconciliation evidence before retry.

### R-02 — Mistaken or disputed publication

1. Disable further publish/promotion for the school; do not delete published results.
2. Record incident and affected exam/result checksum; preserve student-visible evidence.
3. Determine whether calculation, source marks, policy, or authorization was wrong.
4. Use approved correction workflow: reopen/supersede, re-collect if needed, recalculate, manager confirm, republish version.
5. Reverse/replace promotion only through an audited compensating transition.
6. Notify affected users according to approved communications policy.

### R-03 — Teacher deadline dispute or locked sheet

1. Verify server deadline/timezone and assignment ownership; do not rely on client clock screenshot alone.
2. Inspect draft/submit/rejected-attempt audit events and service health.
3. Admin decides reopen/late exception under approved policy and records reason.
4. Reopen only the affected sheet; preserve original submitted timestamp/version.
5. Require final resubmit and include late/exception flag in monitoring.

### R-04 — Duplicate or wrong promotion

1. Trigger promotion kill switch for the school/course/exam.
2. Lock affected transition source and collect result, enrollment, current class, and history records.
3. Identify authoritative intended destination using frozen rules and approved event.
4. Write a compensating transition; never delete the erroneous event or edit history invisibly.
5. Reconcile all students from the same batch and verify one active enrollment per year.
6. Manager confirms correction and restart criteria.

### R-05 — Course over-capacity or incorrect waitlist promotion

1. Disable offer acceptance/manual add for the course.
2. Lock course seat records and reconstruct ordered state transitions.
3. Do not remove a learner silently; apply approved conflict policy with human review.
4. Correct through release/re-offer compensating events and reconcile finance/consent state.
5. Run concurrency test before re-enabling.

### R-06 — Course payment mismatch/refund backlog

1. Disable fee-gated enrollment transition, not finance read access.
2. Compare course finance link to invoice, posted transactions, receipts, refunds, and closed period.
3. Accountant corrects only through finance-owned posting/reversal/void controls.
4. Course refreshes derived state; admin cannot override Paid.
5. Reconcile all course invoices before restart.

### R-07 — Cross-school or unauthorized access

1. Activate global/school mutation kill switch and revoke affected session/account if needed.
2. Preserve security logs, request/correlation IDs, and access scope; do not expose details broadly.
3. Patch ownership/permission path and run full two-school matrix.
4. Determine exposure and notification duties with security/privacy owners.
5. Re-enable only after manager/security approval and audit completeness check.

### R-08 — Audit pipeline gap

1. Stop affected high-risk writes immediately.
2. Identify mutation window and correlate database timestamps, source events, and application logs.
3. Do not fabricate original actor/reason; mark reconstructed events explicitly with provenance.
4. Fix atomic audit behavior and replay only defensible metadata.
5. Manager/security approve resumption.

## 11. Tabletop scenarios and required evidence

| Scenario | Participants | Exercise injects | Pass evidence |
| --- | --- | --- | --- |
| T-01 migration fails after a batch | DB owner, app owner, rollback commander, manager | journal mismatch plus partial backfill | Correct stop; no blind rerun; counts preserved; restore/forward-fix decision documented. |
| T-02 mistaken final publish | Admin, manager, academic lead, support | wrong pass-rule version after student visibility | Publish frozen; immutable original preserved; superseding correction and communication plan demonstrated. |
| T-03 deadline dispute | Admin, teacher, manager | teacher claims submit before deadline; client/server times differ | Server audit reconstructs event; policy-based reopen/late decision with reason; no global unlock. |
| T-04 duplicate promotion | Admin, DB/app owner, manager | retry creates conflicting class state | Kill switch used; one authoritative active enrollment restored by compensating event; full batch reconciled. |
| T-05 course last-seat race | Admin, guardian tester, backend owner | two acceptances for one seat | Exactly one hold; other deterministic waitlist state; capacity never exceeded. |
| T-06 paid course cancelled | Admin, manager, accountant | running course with paid/partial/unpaid roster | Academic cancellation separated from finance reversals; exception queue reconciles to ledger. |
| T-07 cross-school guessed ID | Security owner, QA, app owner | teacher/admin submits another school's nested ID | Request denied without leakage; event captured; no mutation; matrix regression passes. |
| T-08 audit write outage | App/DB owner, manager | audit insert fails during publish/reopen | Mutation rolls back or high-risk write is disabled; no unaudited success. |
| T-09 database restore | DB owner, rollback commander, app owner | corruption requires point-in-time restore | Proven RTO/RPO, isolated validation, connection cutover, reconciliation of post-backup events. |
| T-10 global kill switch | Manager, app owner, support | promotion anomaly during cohort rollout | New writes stop promptly; reads/correction remain available; scope and recovery communicated. |

Tabletop results must include date, environment, participants, timeline, actual commands/screens used, observed gaps, owner/due date, and manager disposition. A verbal walkthrough alone is not passing evidence.

## 12. Go/no-go checklist

Production activation is **NO-GO** unless all are true:

- `RES-01` and `RES-04` blocking decisions are approved and versioned;
- role/action matrix and break-glass stance are approved by security/school governance;
- structured atomic audit exists for every enabled high-risk mutation;
- retention/access policy is approved for the operating jurisdiction;
- additive migration passed on a production-shaped restored copy with explained reconciliation;
- a real provider backup and restore rehearsal meet approved RTO/RPO;
- global and per-school feature controls plus emergency write-stop are tested;
- metrics/alerts route to named responders and test alerts were acknowledged;
- T-01 through T-10 have passing evidence or manager-approved remediation completed;
- zero open P0/P1 defects; known lower-severity limitations have owners and accepted impact;
- manager records the exact schools/features/cohort, observation window, rollback owner, and final approval.

## 13. Manager confirmation request

This specification is ready for review as evidence for `RES-05`. The manager should either:

1. approve the recommended target as the basis for stakeholder decisions; or
2. return explicit revisions tied to permission IDs `P-01`–`P-06`, retention, infrastructure/RTO/RPO, metrics/alert ownership, or tabletop acceptance.

**Current result:** operational research/specification complete; permission, retention, infrastructure, and governance decisions remain intentionally pending rather than assumed.
