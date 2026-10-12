# Exam academic policy decisions

Status: **PENDING STAKEHOLDER CONFIRMATION**  
Prepared: 2026-10-12  
Required approvers: Academic owner / school owner and delivery manager  
Effective date: **PENDING**

## Gate warning

This record proposes safe defaults so stakeholders can make concrete choices. The recommendations are **not approved policy** and must not be encoded into a frozen database schema, API contract, result calculation, or production workflow until the required approvers confirm them.

`RES-01` remains **BLOCKED** and manager gate G1 remains **BLOCKED** while any decision below is Pending. Wave 2 discovery/prototyping may continue, but the `BE-01` schema contract must not be frozen and no destructive migration may be generated or applied.

## Decision status key

- **PENDING:** recommended default only; stakeholder answer required.
- **CONFIRMED:** dated approval recorded with approver names and any amendment.
- **REJECTED/REPLACED:** recommendation was declined and the approved replacement is written explicitly.

## Six required decisions

### PASS-01 — Pass/fail basis

- **Status:** PENDING
- **Recommended default:** A student passes only when both conditions are true: overall weighted average is at or above the exam pass average, and every required subject score is at or above that subject's minimum. Templates may explicitly mark a subject non-required.
- **Boundary example:** Pass average 50%, subject minimum 40%; scores 80 and 35 produce a 57.50% average but an overall `Failed` outcome because one required subject is below 40.
- **Why recommended:** It implements both global achievement and the requested per-subject safeguard without silently allowing a critical-subject failure.
- **Schema/API/UI impact:** Frozen template/session rules need pass average, per-subject minimum, subject requirement flag, failure reasons, and passed/failed subject counts. Results must expose both average and failed-subject evidence.
- **Required test trace:** `BE-04` golden fixtures and `QA-02` threshold tests for exactly-at, below, and above both thresholds.
- **Stakeholder answer / amendment:** PENDING

### MARK-01 — Maximum-mark model

- **Status:** PENDING
- **Recommended default:** Configure maximum and minimum-pass marks independently per template subject. The exam-level total is derived as the sum of included subject maxima and is displayed read-only. A “set all subjects to” convenience action may populate equal maxima but does not change the underlying per-subject model.
- **Boundary example:** Mathematics max 100, English max 80; scores 70 and 60 produce 130/180, not 130/200.
- **Why recommended:** It supports both meanings raised in the brief, handles unequal subjects correctly, and removes the current hard-coded `/100` limitation.
- **Schema/API/UI impact:** Template-subject and assignment snapshots require `max_mark` and `minimum_mark`; score validation uses the assignment snapshot; totals and normalized averages use possible marks.
- **Required test trace:** `BE-03` snapshot/generation tests, `BE-04` unequal-maximum fixtures, and `QA-02` bounds tests.
- **Stakeholder answer / amendment:** PENDING

### DEADLINE-01 — Submission after teacher deadline

- **Status:** PENDING
- **Recommended default:** Permit final submission after the deadline but record server-derived `Late` status, submitted timestamp, and lateness duration. Admin may hard-lock a specific assignment or exam; reopening a submitted sheet always requires a reason and audit event.
- **Boundary example:** Deadline 15:00 Africa/Mogadishu; submission at 15:00:01 is accepted as `Late`, while a server-side hard lock returns a clear blocked response until admin reopens.
- **Why recommended:** It preserves marks during operational delays while making lateness visible and auditable instead of silently accepting or losing work.
- **Schema/API/UI impact:** Store timezone-aware deadline, submitted timestamp, late metadata, optional lock, reopen reason/actor; server time is authoritative.
- **Required test trace:** `BE-03` deadline projection and `QA-02` fake-clock tests immediately before, at, and after the boundary.
- **Stakeholder answer / amendment:** PENDING

### REEXAM-01 — Re-exam subject scope

- **Status:** PENDING
- **Recommended default:** A re-exam includes only the required subjects the student failed, with eligibility stored per student and subject. Admin may add a subject only through a reasoned Special review action.
- **Boundary example:** A student passes English and fails Mathematics; the re-exam roster contains only that student's Mathematics assignment.
- **Why recommended:** It avoids retesting passed work and is consistent with a durable per-subject eligibility record.
- **Schema/API/UI impact:** Re-exam eligibility must be student/subject scoped, assignments must support filtered rosters, and the UI must show why each subject is included.
- **Required test trace:** `BE-04` eligibility fixtures and `QA-02` tests proving passed subjects cannot be entered accidentally.
- **Stakeholder answer / amendment:** PENDING

### REEXAM-02 — Treatment of original and re-exam scores

- **Status:** PENDING
- **Recommended default:** Preserve and display both attempts unchanged. The re-exam score does not overwrite or average into the original. It determines whether the failed subject is resolved under the re-exam rule; the final lifecycle outcome links to both result records.
- **Boundary example:** Original Mathematics 35/100, re-exam 55/100, minimum 40: retain 35 and 55; record the failed subject as resolved and recompute the promotion decision from the approved re-exam resolution rule without rewriting the original exam.
- **Why recommended:** It gives a complete audit trail and prevents historical reports from changing after a later attempt.
- **Schema/API/UI impact:** Immutable attempts, parent/result-resolution links, resolution status, and student/admin views showing both attempts are required.
- **Required test trace:** `BE-04` history fixtures and `QA-05` original-to-re-exam end-to-end scenario.
- **Stakeholder answer / amendment:** PENDING

### PROMOTION-01 — Promotion timing

- **Status:** PENDING
- **Recommended default:** Publishing a Final exam calculates and publishes promotion eligibility only. Actual class transition occurs through an explicit, idempotent academic-year transition after failures, re-exams, and Special reviews are resolved. The transition targets the new academic year and records an append-only promotion event.
- **Boundary example:** A result published in 2026–2027 shows `Eligible for Class 2`; `students.class_id` and the active enrollment do not change until the approved 2027–2028 year-transition command runs once.
- **Why recommended:** It closes the current immediate-promotion and multiple-active-enrollment risks and matches the brief's statement that transfer happens in the new academic year.
- **Schema/API/UI impact:** Separate eligibility from applied transition; store source result, destination year/class, state, actor, and idempotency key; close the prior active enrollment atomically.
- **Required test trace:** `BE-04` concurrent publish/transition tests and `QA-03` one-active-enrollment/double-promotion tests.
- **Stakeholder answer / amendment:** PENDING

## Additional rules required to make the six decisions executable

### ROUND-01 — Decimal and rounding policy

- **Status:** PENDING
- **Recommended default:** Store entered marks at up to two decimal places; compute totals and averages with exact decimal arithmetic; round displayed and persisted final averages to two decimal places using half-up; compare thresholds against the unrounded calculated value; tied ranks use the unrounded value and competition ranking (`1, 1, 3`).
- **Boundary example:** Calculated average 49.995 displays 50.00, but against a 50.00 threshold it remains below 50 unless the stakeholder explicitly chooses rounded-value comparison.
- **Required test trace:** `BE-04` decimal/tie fixtures and `QA-02` threshold property tests.
- **Stakeholder answer / amendment:** PENDING

### EMPTY-01 — Zero-student and zero-subject behavior

- **Status:** PENDING
- **Recommended default:** A generated class/subject assignment with zero eligible students is `Not applicable`, not `Submitted`, and does not reduce completion. An exam with zero applicable students or zero applicable subjects cannot be published and must be cancelled or corrected.
- **Boundary example:** One selected class has no active enrollment and another has 20 students; the empty class is excluded from the denominator with an explanation, while the populated class still requires complete submissions.
- **Required test trace:** `BE-03` generation/readiness tests and `QA-03` publish invariant tests.
- **Stakeholder answer / amendment:** PENDING

### ATTENDANCE-01 — Missing, absent, withdrawn, and exempt marks

- **Status:** PENDING
- **Recommended default:** Never convert an empty score to zero. Each roster row must be `Scored`, `Absent`, `Withdrawn`, or `Exempt`; `Absent` blocks publication until an approved absence/re-exam decision, while withdrawn/exempt rows require reason and actor and are excluded according to the frozen template policy.
- **Boundary example:** An empty Mathematics input is reported as missing and prevents submit; marking the student Absent records a reason but still prevents main-result publication until resolved.
- **Required test trace:** `BE-04` outcome fixtures and `QA-02` roster completeness/state tests.
- **Stakeholder answer / amendment:** PENDING

### FINAL-01 — Graduating/final class behavior

- **Status:** PENDING
- **Recommended default:** A passing student in a final class receives `Completed/Graduated` with no target class; the system must not invent or require a next class. Failed students follow the approved re-exam/repeat/Special review process.
- **Boundary example:** Final Class has no successor; a pass publishes `Graduated`, while a fail remains unresolved until an allowed decision is recorded.
- **Required test trace:** `BE-04` final-class calculation fixture and `QA-03` no-target invariant test.
- **Stakeholder answer / amendment:** PENDING

### SPECIAL-01 — Special review outcome

- **Status:** PENDING
- **Recommended default:** Special review does not edit a published score directly. It opens a reasoned, auditable case that may end in `No change`, a new correction attempt linked to the original, `Re-exam`, or `Repeat`. Any correction requires a second authorized approver.
- **Boundary example:** A transposition claim against a published mark creates a case; if upheld, a linked correction record is published while the original remains visible in history.
- **Required test trace:** `BE-04` state-transition tests, `QA-01` approval permissions, and `QA-05` operator recovery scenario.
- **Stakeholder answer / amendment:** PENDING

## Approval checklist

The academic owner and manager must complete all of the following before `RES-01` can be marked Done:

- [ ] Confirm or replace PASS-01.
- [ ] Confirm or replace MARK-01.
- [ ] Confirm or replace DEADLINE-01.
- [ ] Confirm or replace REEXAM-01.
- [ ] Confirm or replace REEXAM-02.
- [ ] Confirm or replace PROMOTION-01.
- [ ] Confirm or replace ROUND-01.
- [ ] Confirm or replace EMPTY-01.
- [ ] Confirm or replace ATTENDANCE-01.
- [ ] Confirm or replace FINAL-01.
- [ ] Confirm or replace SPECIAL-01.
- [ ] Confirm every chosen rule has at least one named acceptance test in `BE-04`, `QA-02`, `QA-03`, or `QA-05`.
- [ ] Record effective date and how already-collecting exams are treated.

## Sign-off

Academic owner / school owner: **PENDING**  
Decision date: **PENDING**  
Delivery manager: **PENDING**  
Manager confirmation: **BLOCKED — stakeholder decisions remain pending**
