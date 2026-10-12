# Exam implementation manager review

Review date: 2026-10-12  
Manager role: delivery manager and final specification reviewer  
Reviewed inputs:

- User-supplied Somali implementation brief, including the 15-step implementation order and six unresolved policy questions.
- `docs/EXAM_IMPLEMENTATION_TODO_DRAFT.md` — exactly 20 work packages: five Design/Frontend, five Backend/Database, five Bug Fix/QA, and five Research/Gap Analysis.
- `docs/EXAM_GAP_AUDIT.md` — repository-backed audit with `GAP-01` through `GAP-18` and eight decision records.
- Current repository implementation in the class, academic-year, exam, teacher, student, schema, migration, and test files cited by the audit.
- Baseline verification: `npm test` passed on 2026-10-12 (2 suites, 2 passed, 0 failed). This verifies current prototype behavior only.

## Manager decision

**MANAGER-CONFIRMED — the 20 TODO specifications are approved as a complete and consistent delivery plan.**

This is approval of scope, ownership, dependencies, risks, acceptance criteria, and evidence requirements. It is **not** confirmation that product implementation is complete. Every TODO remains `Proposed` until its entry gate is satisfied, and no TODO may be marked `Done` until the manager reviews its required evidence and records `Manager confirmation: approved` on that item.

No specification revisions are required. Unresolved academic and operational choices have not been guessed; they are intentionally assigned to `RES-01`, `RES-03`, `RES-04`, and `RES-05`. Work depending on those decisions remains execution-blocked even though its specification is approved.

## Status interpretation

- **APPROVED:** the work package is sufficiently specified and consistent. It may enter its assigned wave once all dependencies and entry gates are cleared.
- **NEEDS_CHANGES:** the specification is ambiguous, inconsistent, or lacks testable acceptance evidence. No item has this status in this review.
- **BLOCKED:** the specification cannot yet be approved. No item has this status in this review. Runtime dependencies are recorded separately so an approved future-wave item is not mistaken for immediately executable work.

## Per-item manager review

| TODO | Status | Owner role | Wave | Manager rationale | Entry gate / current execution constraint | Required manager confirmation before Done |
|---|---|---|---:|---|---|---|
| DES-01 | APPROVED | Senior Design/Frontend 1 | 2 | Matches the six-field Class form and explicitly prevents legacy progression/course values from being silently reset. Covers desktop, mobile, validation, errors, and accessibility. | `RES-02`; approved compatibility/API contracts from `BE-01` and `BE-02`. | Compare delivered UI and payload to the six-field contract; approve responsive, keyboard, and create/edit evidence. |
| DES-02 | APPROVED | Senior Design/Frontend 2 | 2 | Covers the one-time, resumable five-step onboarding and persistent Exam Settings requested by the brief. Correctly requires server-owned completion state. | `RES-01`, `RES-02`, and `BE-02` setup/settings API. | Approve all five step contracts, resume/error states, completion confirmation, and post-completion Settings path. |
| DES-03 | APPROVED | Senior Design/Frontend 3 | 3 | Separates reusable templates from exam sessions and includes category, maxima, rules, class selection, dates, deadline, publish mode, and assignment preview. | Mark semantics from `RES-01`, source of truth from `RES-03`, then `BE-02`/`BE-03`. | Approve template/session copy, inheritance rules, missing-teacher errors, and review-screen evidence. |
| DES-04 | APPROVED | Senior Design/Frontend 4 | 3 | Directly covers teacher Draft/Submit/lock/reopen and the requested deadline, late, time-left, missing-marks, and admin completion monitoring states. | Deadline policy in `RES-01`; backend status/max-mark contract in `BE-03`; boundary behavior in `QA-02`. | Approve fake-clock, boundary, large-roster, accessibility, and both role-journey evidence. |
| DES-05 | APPROVED | Senior Design/Frontend 5 | 4 | Covers Repeat/Re-exam/Special review, course lifecycle and consent/payment visibility, published-only student results, offers, and immutable promotion history. | `RES-01`, `RES-04`, `BE-04`, and `BE-05`. | Approve role visibility, consent copy, unpublished-data tests, lifecycle scenarios, mobile, and accessibility evidence. |
| BE-01 | APPROVED | Senior Backend/Database 1 | 2 | Provides the additive normalized foundation for progression, templates, sessions, detailed results, standalone courses, payments, and promotion history. Includes tenant keys, constraints, compatibility, and reconciliation. | All core policy/data boundaries from `RES-01`, `RES-02`, and `RES-04`; ERD approval before migration generation. | Approve ERD and generated SQL first; approve fresh/upgrade migration, constraint, row-count, relationship, and rollback evidence before Done. |
| BE-02 | APPROVED | Senior Backend/Database 2 | 2 | Correctly makes onboarding, settings, progression, and template versioning server-owned, school-scoped, auditable, and closed-year aware. | `BE-01`, `RES-01`, and permission matrix from `RES-05`. | Approve endpoint/versioning contract, then role, isolation, cycle, resume, version, closed-year, rollback, and audit evidence. |
| BE-03 | APPROVED | Senior Backend/Database 3 | 3 | Replaces client-generated arbitrary assignments with deterministic server generation from frozen templates, academic-year rosters, maxima, and deadlines. | `BE-01`, `BE-02`, and authoritative assignment source in `RES-03`. | Approve assignment algorithm/error contract; then deterministic, idempotency, timezone, roster-change, and load evidence. |
| BE-04 | APPROVED | Senior Backend/Database 4 | 3 | Separates calculation/publication from promotion, preserves all exam attempts, makes publish idempotent, and requires frozen rules and golden fixtures. Closes the current immediate-promotion P0 risk. | Signed policy in `RES-01`, plus `BE-01` and `BE-03`. | Approve calculation and promotion-event policy; then golden results, concurrency, rollback, idempotency, and historical-attempt evidence. |
| BE-05 | APPROVED | Senior Backend/Database 5 | 4 | Implements the requested course as a standalone lifecycle with eligibility, consent, capacity, fee/payment, exam, normal-promotion fallback, and immutable accelerated transitions. | Finance/consent contract in `RES-04`, then `BE-01` and `BE-04`. | Approve finance/consent boundary; then state lifecycle, concurrent capacity, payment contract, promotion, history, and closure-report evidence. |
| QA-01 | APPROVED | Senior Bug Fix/QA 1 | 3–4 | Turns authorization and school ownership into a full two-school negative matrix, including nested IDs and published-only student/guardian access. | Endpoint contracts from `BE-02`–`BE-05` and permissions from `RES-05`; execute incrementally by wave. | Approve access matrix before execution and accept only with zero unresolved high-severity findings. |
| QA-02 | APPROVED | Senior Bug Fix/QA 2 | 3 | Covers stored per-subject bounds, decimals, roster completeness, missing/withdrawn/absent states, deadline behavior, idempotent submission, locking, and reasoned reopen. | `RES-01`, `BE-03`, and `BE-04`. | Approve transition table, then property, fake-clock, duplicate/missing/ineligible, concurrency, and lock/reopen evidence. |
| QA-03 | APPROVED | Senior Bug Fix/QA 3 | 3–4 | Converts the brief's critical invariants into database constraints and race-safe tests: one active enrollment, no double promotion, valid progression, capacity, closed-year protection, and final classes. | `BE-01`, `BE-04`, and course-specific checks after `BE-05`. | Approve invariant map, then constraint, concurrency, retry/idempotency, final-class, and closed-year traceability. |
| QA-04 | APPROVED | Senior Bug Fix/QA 4 | 5 | Provides the required existing-data migration and final reconciliation without inventing meaning for ambiguous prototype course/class records. Includes quarantine and restore rehearsal. | `RES-02`, `BE-01`, and rollout controls in `RES-05`. | Approve legacy mapping before execution; accept only a reconciled anonymized snapshot report plus documented restore result. |
| QA-05 | APPROVED | Senior Bug Fix/QA 5 | 5 | Supplies the final end-to-end, regression, accessibility, responsive, performance, build, audit, and recovery release gate across all roles and workflows. | All design, backend, and earlier QA items. | Approve release test plan; final release confirmation requires all commands, lifecycle scenarios, reports, limitations, and runbooks to pass review. |
| RES-01 | APPROVED | Research/Gap Analysis 1 | 1 | Correctly treats the six user questions as blocking decisions rather than implementation assumptions and adds necessary rounding, absence, ties, graduation, and Special review rules. | Stakeholder/academic-owner answers required. | Manager and academic owner sign a dated decision record with boundary examples and test traceability. |
| RES-02 | APPROVED | Research/Gap Analysis 2 | 1 | Establishes the current-state inventory needed to migrate the partial prototype safely and identify duplicate sources of truth. | Representative anonymized data preferred; fixture-only conclusions must be labelled. | Manager confirms every supplied requirement is classified and mapped to an owner, migration action, and TODO. |
| RES-03 | APPROVED | Research/Gap Analysis 3 | 1 | Resolves the current conflict between workspace JSON subjects and relational subject/class/teacher/timetable data, which must be settled before deterministic generation. | `RES-02` and academic/operations input. | Manager approves one canonical source, migration, duplicate/override rules, edge cases, and exact generation algorithm. |
| RES-04 | APPROVED | Research/Gap Analysis 4 | 1 | Defines the missing course consent, seat reservation, payment, cancellation/refund, waitlist, and finance ownership state machine before course schema work. | `RES-02` plus finance and academic stakeholders. | Manager records stakeholder approval of all states, transitions, ownership, and in/out-of-scope integrations. |
| RES-05 | APPROVED | Research/Gap Analysis 5 | 1 | Adds the missing permission, audit retention, staged rollout, observability, stop conditions, and operator recovery plan for high-impact academic actions. | `RES-01`, `RES-04`, and confirmed infrastructure capabilities. | Manager approves the role/action matrix and go/no-go checklist after all required tabletop exercises pass. |

## Approved execution order and waves

### Wave 1 — Decisions and source-of-truth research

Complete `RES-01`–`RES-05`. `RES-02` begins immediately; `RES-03` and `RES-04` may proceed as soon as its relevant inventory evidence is available. This wave must produce signed, versioned records. Research output is not considered complete when it only lists questions.

**Manager gate G1:** confirm all required decisions, owners, edge cases, source-of-truth choices, permission boundaries, rollout controls, and test traceability. No schema contract is frozen before G1.

### Wave 2 — Data foundation, settings, and Class simplification

Finalize and approve the `BE-01` ERD/migration design, then implement the additive schema and `BE-02`. Build `DES-01` and `DES-02` against approved contracts; UI prototyping may occur earlier, but integration may not assume unresolved contracts.

**Manager gate G2:** approve migration/reconciliation evidence, API versioning and audit behavior, six-field Class behavior, and resumable onboarding. Legacy columns remain available until the later cutover gate.

### Wave 3 — Core exam lifecycle

Implement `BE-03` and `BE-04` with `DES-03` and `DES-04`. Run `QA-01`, `QA-02`, and the non-course parts of `QA-03` continuously rather than deferring them to release week.

**Manager gate G3:** approve deterministic assignments, deadline behavior, calculation fixtures, publish idempotency, re-exam history, deferred promotion behavior, monitoring, and role isolation. No real results are published with the new path before G3.

### Wave 4 — Course lifecycle and complete student experience

Implement `BE-05` and `DES-05`. Complete course endpoint security in `QA-01` and capacity/transition concurrency coverage in `QA-03`.

**Manager gate G4:** approve the full offer/consent/payment/capacity/course-exam/accelerated-transition lifecycle and confirm normal promotion remains intact after course failure.

### Wave 5 — Migration rehearsal and release

Execute `QA-04`, then `QA-05`. Reconcile a production-shaped anonymized copy, rehearse restore, run all automated and manual release checks, and document operator recovery.

**Manager gate G5:** final go/no-go. Production activation requires zero open P0/P1 defects, approved reconciliation and restore evidence, passed permission/invariant matrices, accepted known limitations, and a named rollback owner.

## Gap-to-TODO traceability

| Audit gaps | Primary closure TODOs |
|---|---|
| GAP-01 immediate promotion; GAP-02 multiple active enrollments | `RES-01`, `BE-01`, `BE-04`, `QA-03` |
| GAP-03 Class not simplified | `DES-01`, `BE-01`, `BE-02`, `QA-04` |
| GAP-04 unsafe/incomplete migration | `RES-02`, `BE-01`, `QA-04`, `RES-05` |
| GAP-05 fixed `/100`, average-only results | `RES-01`, `DES-03`, `DES-04`, `BE-01`, `BE-04`, `QA-02` |
| GAP-06 closed-year mutations | `BE-02`, `BE-04`, `BE-05`, `QA-03`, `RES-05` |
| GAP-07 onboarding/settings absent | `DES-02`, `BE-01`, `BE-02` |
| GAP-08 templates absent | `DES-03`, `BE-01`, `BE-02`, `BE-03` |
| GAP-09 incomplete session contract | `DES-03`, `BE-03`, `RES-03` |
| GAP-10 deadlines/Late absent | `RES-01`, `DES-04`, `BE-03`, `QA-02` |
| GAP-11 incomplete monitoring | `DES-04`, `BE-03`, `QA-02` |
| GAP-12 incomplete re-exam policy/model | `RES-01`, `DES-05`, `BE-04`, `QA-02` |
| GAP-13 no standalone course entity | `RES-04`, `DES-05`, `BE-01`, `BE-05`, `QA-03` |
| GAP-14 no transition ledger | `BE-01`, `BE-04`, `BE-05`, `QA-03` |
| GAP-15 limited student dashboard | `DES-05`, `BE-04`, `BE-05`, `QA-01` |
| GAP-16 conflicting assignment sources | `RES-02`, `RES-03`, `BE-03`, `QA-04` |
| GAP-17 DB tenant/integrity limitations | `BE-01`, `QA-01`, `QA-03` |
| GAP-18 insufficient policy/migration tests | `QA-01`–`QA-05` |

## Non-negotiable manager confirmation protocol

For every TODO, the owner must submit one evidence packet containing:

1. TODO ID, owner, implementation commit/ref, and dependency confirmations.
2. Acceptance-criteria checklist with links to code, migration, UI, tests, and relevant decision records.
3. Commands run and exact pass/fail results; screenshots or browser evidence for visual/role workflows where applicable.
4. Data-impact, security/tenant, rollback, and known-limitation notes.
5. Explicit request for manager review.

The manager will record exactly one review outcome:

- `APPROVED — Manager confirmation: approved; TODO may move to Done.`
- `NEEDS_CHANGES — TODO remains In progress; revisions and evidence are listed.`
- `BLOCKED — TODO cannot proceed; blocking decision, dependency, owner, and unblock condition are listed.`

No self-approval is allowed. A passing test suite alone is not manager confirmation. Approval of this plan does not pre-approve later implementation evidence, and the final production release requires the separate G5 confirmation.
