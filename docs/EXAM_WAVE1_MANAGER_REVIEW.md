# Exam implementation Wave 1 manager review

Review date: 2026-10-12  
Gate: G1 — policy, ownership, source-of-truth, finance/consent, permissions, and operations  
Overall status: **BLOCKED**

## Manager decision

Wave 1 research is thorough and its technical recommendations are suitable for stakeholder decision-making, but G1 is **not cleared**. `RES-02` is approved. `RES-01`, `RES-03`, `RES-04`, and `RES-05` each still require named stakeholder decisions or executed evidence required by their own acceptance gates.

**Wave 2 schema freeze is prohibited while G1 is BLOCKED.** Teams may continue read-only discovery, wireframes, throwaway prototypes, and reversible migration design. They may not freeze the `BE-01` ERD, treat recommended defaults as product policy, generate/apply destructive migrations, or start implementation whose data contract depends on a Pending decision.

No document revision is requested in this review. The blockers are external decisions and evidence, not missing specification text. When decisions are received, the relevant record must be updated with the answer, approver, decision date, effective date/version, affected tests, and any change to downstream contracts before re-review.

## Per-item status and evidence

| Item | Status | Reviewed output | Evidence accepted | Remaining blocker / unblock condition | Manager disposition |
|---|---|---|---|---|---|
| RES-01 | **BLOCKED** | `docs/EXAM_POLICY_DECISIONS.md` | Six user questions are expressed as explicit safe defaults with boundary examples, schema/API/UI impact, and test traceability. Additional executable policies cover rounding, empty rosters, attendance states, final classes, and Special review. All recommendations are correctly labelled Pending. | Academic owner/school owner must confirm or replace PASS-01, MARK-01, DEADLINE-01, REEXAM-01, REEXAM-02, PROMOTION-01, ROUND-01, EMPTY-01, ATTENDANCE-01, FINAL-01, and SPECIAL-01; record effective date and treatment of collecting exams; manager must countersign. | Recommendation record approved as decision material; **not approved as academic policy and not Done**. |
| RES-02 | **APPROVED** | `docs/EXAM_GAP_ANALYSIS.md` | Exhaustive mapping of requested class/setup fields, requested and supporting entities, lifecycle flows, safety, migration, duplicate sources of truth, and tests to Existing/Partial/Missing/Conflicting/Legacy states. Every row has repository evidence, migration action, and closure TODO. Production distributions are explicitly `UNKNOWN`; fixture conclusions are labelled. Required anonymized preflight is defined. | Live preflight remains a `BE-01`/`QA-04` entry requirement, but its absence does not invalidate the current-state repository inventory. | **Manager confirmation: approved; RES-02 may move to Done.** |
| RES-03 | **BLOCKED** | `docs/EXAM_ASSIGNMENT_SOURCE.md` | Canonical relational offering model is separated from timetable slots; exact 12-step atomic deterministic algorithm, stable ordering, idempotency, duplicate/co-teacher/unassigned/replacement/date rules, JSON/portal migration and quarantine, structured error contract, and ten count examples are specified. Six reference simulations matched expected counts. | Academic/operations owner must confirm: exactly one effective Lead; unscoped legacy teacher mappings are review-only, never “all classes”; teacher resolution occurs at session start. `RES-05` must settle co-teacher access/submit permissions. | Technical contract approved for decision; **source-of-truth decision is not frozen and RES-03 is not Done**. |
| RES-04 | **BLOCKED** | `docs/COURSE_POLICY_AND_FINANCE_CONTRACT.md` | Evidence-backed current boundary; standalone course/offer/consent/seat/payment/course-result state machines; finance-owned ledger/refund rule; deterministic capacity/waitlist behavior; cancellation matrix; 12 invariants; eight walkthroughs; C-01..C-10 decision register. Recommended defaults are clearly non-binding. | Named academic, safeguarding, operations, finance, governance, and product approvers must decide C-01..C-10. Finance must confirm invoice/payment/refund ownership; stakeholders must replay all eight walkthroughs with approved choices and resolve every contradiction. | Contract approved as stakeholder packet; **finance/consent state machine is not frozen and RES-04 is not Done**. |
| RES-05 | **BLOCKED** | `docs/EXAM_OPERATIONS_AND_PERMISSIONS.md` | Repository-backed auth/audit/deployment baseline; complete role/action matrix; P-01..P-06; structured atomic audit and retention proposal; global/per-school rollout states; staged gates; backup/restore and stop conditions; metrics/alerts; eight recovery runbooks; ten tabletop scenarios; go/no-go checklist. | Governance/security/privacy must decide P-01..P-06 and retention/access. Infrastructure owners must confirm Neon restore capabilities, RTO/RPO, flag/monitoring providers, thresholds, responders, and notification paths. T-01..T-10 require dated executed evidence and closed remediation, not a verbal plan. | Operations contract approved as decision/exercise plan; **permissions/rollout controls are not approved for implementation and RES-05 is not Done**. |

## G1 accepted evidence

1. **Policy decision packet:** [EXAM_POLICY_DECISIONS.md](EXAM_POLICY_DECISIONS.md) contains concrete defaults rather than unanswered prose, but deliberately retains Pending status.
2. **Current-state inventory:** [EXAM_GAP_ANALYSIS.md](EXAM_GAP_ANALYSIS.md) maps the supplied requirements to repository facts and safe migration ownership without claiming access to live production data.
3. **Assignment source:** [EXAM_ASSIGNMENT_SOURCE.md](EXAM_ASSIGNMENT_SOURCE.md) eliminates client/workspace-array and timetable-cardinality ambiguity through a deterministic relational offering proposal.
4. **Course/finance boundary:** [COURSE_POLICY_AND_FINANCE_CONTRACT.md](COURSE_POLICY_AND_FINANCE_CONTRACT.md) prevents academic code from forging payment and prevents manual adds from bypassing consent/capacity.
5. **Operations and permissions:** [EXAM_OPERATIONS_AND_PERMISSIONS.md](EXAM_OPERATIONS_AND_PERMISSIONS.md) defines deny-by-default target permissions, atomic audit, phased rollout, kill switches, restore discipline, alerts, runbooks, and tabletop acceptance.
6. **Repository baseline:** `npm test` passed on 2026-10-12: 2 suites, 2 passed, 0 failed. This confirms current prototype behavior only and does not clear G1.

## Required decisions to clear G1

### Academic owner / school owner

- Confirm or replace all RES-01 rules, including threshold comparison/rounding and promotion timing.
- Confirm the one-Lead assignment rule, session-start resolution instant, and treatment of unscoped legacy mappings.
- Decide course target/promotion, learner/guardian consent, late entry, and manual override boundaries.
- Decide manager confirmation requirements for publish, year transition, correction, and running-course cancellation.

### Finance owner

- Confirm whether course charges reuse the existing invoice/transaction/refund ledger.
- Decide payment prerequisite, partial payment, waiver authority, refund/credit schedule, currency, and external settlement scope.
- Confirm that academic/admin APIs can read derived status but cannot set `Paid`.

### Operations / safeguarding / governance / privacy / security

- Approve seat-hold duration, waitlist order/refill cutoff, consent actor/legal evidence, and any override authority.
- Decide P-01..P-06, audit access/export, break-glass scope, retention, legal/dispute holds, and correction communications.
- Name migration, database, rollback, application, communications, alert, and incident owners.

### Infrastructure and exercise owners

- Confirm backup provider capability, restore method, RTO/RPO, connection cutover, feature-control implementation, monitoring provider, thresholds, notification paths, and support coverage.
- Execute T-01 through T-10 in a safe environment; record date, participants, commands/screens, outcome, gaps, owner/due date, and manager disposition.

## Re-review checklist

G1 may change from `BLOCKED` to `APPROVED` only when:

- [ ] Every Pending ID in RES-01, RES-03, RES-04, and RES-05 has one explicit answer, approver, date, and version/effective date.
- [ ] Cross-document conflicts are reconciled—for example promotion timing in RES-01/04, consent in RES-04/05, and manager permissions in RES-05.
- [ ] Each approved decision links to downstream schema/API/UI acceptance tests.
- [ ] Assignment edge examples are rerun with approved source rules.
- [ ] Course state walkthroughs are rerun with approved C-01..C-10 answers.
- [ ] Infrastructure facts replace proposed restore/flag/monitoring assumptions.
- [ ] T-01 through T-10 have executed evidence and all blocking findings are closed.
- [ ] Manager records `G1 APPROVED` with the exact approved document versions.

Until then: **G1 BLOCKED — no Wave 2 schema freeze.**
