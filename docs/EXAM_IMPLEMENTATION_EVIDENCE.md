# Exam implementation delivery evidence

Last updated: 2026-10-12 07:56 Africa/Mogadishu  
Reviewer: implementation delivery manager / QA  
Rule: plans and proposed contracts are not implementation evidence. A gate clears only after the referenced code, migration, automated tests, and required runtime/reconciliation evidence are reviewed.

## Current gate summary

| Gate / wave | Status | Code evidence | Test/runtime evidence | Blocking findings |
|---|---|---|---|---|
| G1 — policy and contracts | **BLOCKED** | Research/decision documents exist; no approved policy version is implemented. | RES-03 reference count simulation only; not database/API evidence. | RES-01 decisions Pending; RES-03 stakeholder confirmations Pending; RES-04 C-01..C-10 Pending; RES-05 P-01..P-06, infrastructure and tabletop evidence Pending. |
| G2 — additive foundation, settings, Class simplification | **BLOCKED / NOT SUBMITTED** | No reviewed Wave 2 implementation submission yet. | Baseline commands pass, but they exercise the existing prototype. | G1 blocks schema freeze; no reviewed additive migration, upgrade reconciliation, v2 settings API, or six-field UI evidence. |
| G3 — core exam lifecycle | **BLOCKED / NOT SUBMITTED** | No reviewed Wave 3 implementation submission yet. | Existing tests cover the v1 happy path only. | G1/G2 incomplete; no reviewed deterministic assignment, deadline, calculation, publication, re-exam, deferred-promotion, or tenant matrix evidence. |
| G4 — course lifecycle | **BLOCKED / NOT SUBMITTED** | No reviewed Wave 4 implementation submission yet. | No course capacity/consent/finance concurrency evidence. | RES-04 decisions and earlier gates incomplete. |
| G5 — migration rehearsal and release | **BLOCKED / NOT SUBMITTED** | No reviewed cutover/rollback artifact. | No production-shaped migration/restore/tabletop/browser evidence. | G1–G4 incomplete; release criteria not met. |

## Baseline verification before implementation review

Commands executed from `/home/harun/Documents/hrn/abc` on 2026-10-12:

| Command | Result | Interpretation |
|---|---|---|
| `npm test` | PASS — 2 suites, 2 passed, 0 failed; 13.2 s | Confirms current broad API and frontend prototype tests only. It does not prove v2 requirements. |
| `npm run check` | PASS — all JavaScript/JSX parses, local imports resolve, 0 unbound references | Baseline source integrity. |
| `npm run build` | PASS — Vite production build completed | Baseline build is viable. Vite warned that the main chunk exceeds 500 kB; this is not currently a release-blocking exam defect but must be reassessed after frontend additions. |
| `node scripts/exam-release-preflight.mjs` | EXPECTED BLOCK — exit 1; 11 Pending academic decisions and G1–G5 not approved | The release guard correctly refuses activation while policy and delivery gates remain uncleared. |

## G1 evidence disposition

See `docs/EXAM_WAVE1_MANAGER_REVIEW.md` for the itemized review. Current implementation authority is:

- `RES-02`: **APPROVED / Done**.
- `RES-01`, `RES-03`, `RES-04`, `RES-05`: **BLOCKED**; recommendations are not approved product behavior.
- No implementation may silently convert a `PENDING` recommendation into a hard-coded schema default or calculation rule.
- `BE-01` may produce reversible draft design, but schema freeze and destructive migration remain prohibited.

## Submission requirements for implementation owners

Every wave submission must include:

1. Changed-file list and exact responsibility boundary.
2. Migration/schema/API contract version and compatibility behavior.
3. Acceptance-criteria-to-code/test traceability.
4. Commands run with exact results, plus focused negative/concurrency tests.
5. Known limitations and any policy recommendation temporarily represented as configurable/unapproved.
6. For UI: browser evidence for roles, states, keyboard behavior, and required breakpoints.
7. For data changes: fresh and upgrade migration results, row counts/checksums, quarantine report, and restore path.

## Open review findings

### F-001 — Silent v1 fallback can conceal an incomplete v2 implementation

- **Severity:** P1 release blocker for G2/G3.
- **Owner:** Frontend owner.
- **Finding:** A v2 adapter may support development fallback, but create/score/publish paths must not silently fall back to the current fixed-100, immediate-promotion v1 semantics.
- **Required change/evidence:** Bind to a committed v2 contract; unsupported-v2 must be explicit; tests must prove mutation flows do not silently execute through v1. Read-only compatibility may be separately documented and tested.
- **Status:** OPEN; communicated to frontend owner.

### F-002 — Pending policies cannot become hidden backend defaults

- **Severity:** P0 gate blocker.
- **Owner:** Backend owner.
- **Finding:** G1 remains blocked. Backend scaffolding must not hard-code Pending policy as if stakeholder-approved.
- **Required change/evidence:** Represent provisional behavior as an explicit versioned configuration marked unapproved, or keep dependent endpoints disabled. Tests must prove activation is refused until an approved policy version exists.
- **Status:** OPEN; communicated to backend owner.

### F-003 — V2 authorization and tenant ownership are incomplete

- **Severity:** P0 release blocker.
- **Owner:** Backend owner.
- **Finding:** Incremental route inspection found teacher result reads were not restricted to assigned work, while draft course creation validated class ownership but not nested subject/teacher ownership. The initial template family/version unique key was also global rather than school-scoped.
- **Required change/evidence:** Correct object-level filters and tenant checks/constraints; scope template identity by school; add a parameterized two-school negative test for direct and nested IDs.
- **Status:** OPEN; precise change request sent.

### F-004 — V2 mutation state/invariant guards are incomplete

- **Severity:** P0/P1 gate blocker.
- **Owner:** Backend owner.
- **Finding:** Incremental inspection found score save/submit did not reject Cancelled/non-Collecting sessions; year transition lacked unresolved-decision and database-enforced one-active-enrollment guards; parent-session ownership/FK and atomic audit coverage require review.
- **Required change/evidence:** Enforce state machine and academic-year prerequisites on the server and in constraints where practical; add cancelled-session, concurrent transition, unresolved-failure, parent ownership, and audit rollback tests.
- **Status:** OPEN; precise change request sent.

## Review log

| Time (Africa/Mogadishu) | Event | Outcome |
|---|---|---|
| 2026-10-12 07:56 | Baseline `npm test`, `npm run check`, and `npm run build` | All passed; prototype baseline only. |
| 2026-10-12 07:56 | Frontend owner requested `/api/exams/v2` contract | Allowed isolated scaffolding only; prohibited silent mutation fallback and guessed-contract approval. |
| 2026-10-12 07:56 | Backend owner notified of delivery evidence requirements | Requested committed v2 contract, migrations, tests, limitations, and explicit handling of Pending policy. |
| 2026-10-12 07:59 | Added and ran `scripts/exam-release-preflight.mjs` | Correctly blocked release on 11 Pending policy decisions and uncleared G1–G5. |
| 2026-10-12 08:01 | Incremental `npm test` during frontend work | FAIL: broad frontend test could not resolve removed `AdminExamsSection`; focused class/v2 adapter tests passed. Precise repair request sent to frontend owner; requires re-run before review. |
| 2026-10-12 08:02 | Incremental v2 migration/service/route inspection | Found policy self-confirmation, teacher result over-read, nested course tenant checks, mutation-state, uniqueness, and transition-invariant gaps. Sent backend change request; G2/G3 remain blocked. |
