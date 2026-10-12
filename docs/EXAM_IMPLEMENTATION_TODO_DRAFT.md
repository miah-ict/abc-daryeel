# Exam, Promotion, and Courses Implementation TODO Draft

## Planning contract

This draft translates the supplied Somali implementation plan into 20 independently reviewable work packages. The repository already has a first exam implementation in `server/db/schema/exams.js`, `server/routes/exams.routes.js`, `src/features/admin/components/AdminExamsSection.jsx`, `src/features/teachers/components/TeachersExamsSection.jsx`, and `src/features/students/components/StudentsGradesSection4.jsx`; the work below evolves that baseline instead of rebuilding it blindly.

**Mandatory gate:** every item starts in `Proposed`. An implementer may move it to `In progress` only after the manager confirms its scope and dependencies. It may move to `Done` only after the manager reviews the listed acceptance evidence and records `Manager confirmation: approved`.

## Premium senior design / frontend — 5 TODOs

- [ ] **DES-01 — Simplify the Class create/edit experience and move academic controls out of it**
  - **Objective:** Limit Class create/edit to class name, education level, section, academic year, room, and capacity, while preserving a premium, low-friction admin experience.
  - **Owner:** Senior Design/Frontend 1.
  - **Manager confirmation gate:** Approve the six-field contract before implementation; approve responsive/a11y evidence before Done.
  - **Scope / likely files:** `src/features/admin/components/AdminWorkspace.jsx`, `src/features/admin/components/AdminClassesSection1.jsx`, `src/styles/admin.css`, `src/features/admin/api/adminApi.js`; coordinate API payload changes with `BE-01`/`BE-02`.
  - **Acceptance criteria:** The modal exposes only the six agreed fields; cards no longer present next-class or accelerated-course controls as class attributes; validation, loading, failure, empty, edit, and mobile states are designed; existing class identity data remains editable; progression/course settings are linked from Exam Settings rather than duplicated.
  - **Dependencies:** Manager approval; `RES-02` field/data inventory; final API contract from `BE-01` and `BE-02`.
  - **Risk:** Removing inputs before migration/API compatibility is ready can silently reset legacy progression values.
  - **Verification:** Component test create/edit payloads; keyboard-only modal walkthrough; responsive checks at 360, 768, and 1440 px; manager compares UI against the six-field contract.

- [ ] **DES-02 — Build first-run Exam Onboarding and persistent Exam Settings UX**
  - **Objective:** Create a resumable five-step wizard for academic year, class progression, pass rules, exam templates, and course settings, shown only until setup is complete.
  - **Owner:** Senior Design/Frontend 2.
  - **Manager confirmation gate:** Approve the step model and policy inputs before implementation; approve all wizard-state evidence before Done.
  - **Scope / likely files:** new components under `src/features/admin/components/exams/`, `AdminExamsSection.jsx`, `AdminWorkspace.jsx`, `adminApi.js`, `src/styles/admin.css`.
  - **Acceptance criteria:** First visit to `/dashboard/admin/exams` routes incomplete schools into the wizard; each step validates inline and supports Back/Continue; completion summary requires explicit confirmation; refresh resumes the latest saved step; completed schools see the exam workspace plus an Exam Settings entry that edits the same data; closed-year restrictions and destructive changes are clearly explained.
  - **Dependencies:** `RES-01` policy decisions, `RES-02` baseline inventory, `BE-02` setup/settings endpoints.
  - **Risk:** A local-only completion flag could diverge across devices or administrators and expose an unusable exam workspace.
  - **Verification:** Frontend state tests for new, partial, complete, and API-error schools; refresh/resume browser test; WCAG focus order and error-announcement review; manager signs off every wizard step.

- [ ] **DES-03 — Design exam templates and guided exam-session creation**
  - **Objective:** Replace the current single form with a template library and a guided creation flow that previews generated class/subject/teacher assignments before saving.
  - **Owner:** Senior Design/Frontend 3.
  - **Manager confirmation gate:** Approve the template/session UX contract before implementation; approve interaction evidence before Done.
  - **Scope / likely files:** `AdminExamsSection.jsx`, new `ExamTemplateList`, `ExamTemplateEditor`, and `ExamSessionWizard` components, `adminApi.js`, `admin.css`.
  - **Acceptance criteria:** Admin can create/edit/archive Monthly, Midterm, Final, Re-exam, and Course templates; per-template total or per-subject maximums and failure thresholds are unambiguous; session creation selects year, term, classes or All classes, dates, deadline, publish mode, and template; inherited fields are visible and selectively editable only where policy allows; assignment preview flags missing teachers before submission.
  - **Dependencies:** `RES-01` marks semantics, `RES-03` authoritative teacher-subject mapping, `BE-02`, `BE-03`.
  - **Risk:** Ambiguous “max marks” semantics can make UI labels disagree with stored calculation rules.
  - **Verification:** Form contract tests for all template categories; snapshot/interaction tests for inherited and overridden values; browser test with classes lacking teachers; manager approves copy and review screen.

- [ ] **DES-04 — Upgrade teacher mark entry and admin monitoring to deadline-aware premium workflows**
  - **Objective:** Give teachers a clear assignment queue and safe mark sheet, and give admins live class/subject completion monitoring with actionable late/missing states.
  - **Owner:** Senior Design/Frontend 4.
  - **Manager confirmation gate:** Approve deadline/status presentation before implementation; approve both role journeys before Done.
  - **Scope / likely files:** `src/features/teachers/components/TeachersExamsSection.jsx`, `src/features/admin/components/AdminExamsSection.jsx`, `src/features/teachers/api/teacherApi.js`, `adminApi.js`, `src/styles/teacher.css`, `src/styles/admin.css`.
  - **Acceptance criteria:** Teacher cards show exam, class, subject, max mark, deadline, time remaining, roster count, and Draft/Submitted/Late status; score inputs use the assignment maximum and identify empty/invalid rows; draft and final-submit feedback is durable; submitted sheets are read-only until reopened; admin sees overall and per-class percentages, submitted/pending/late subjects, responsible teacher, deadline, and missing-mark count; Publish clearly explains why it is disabled.
  - **Dependencies:** `RES-01` late-submission rule, `BE-03` deadlines/max-marks status contract, `QA-02` boundary fixes.
  - **Risk:** Client clocks and server clocks can disagree around deadlines, and large rosters may degrade input responsiveness.
  - **Verification:** Fake-clock UI tests before/at/after deadline; 0/max/out-of-range/missing score tests; 500-student rendering check; keyboard and screen-reader table review; manager validates teacher and admin journeys.

- [ ] **DES-05 — Create coherent re-exam, course-offer, results, and promotion-history experiences**
  - **Objective:** Surface the complete student lifecycle to admins and students without mixing main-exam, re-exam, course, and promotion records.
  - **Owner:** Senior Design/Frontend 5.
  - **Manager confirmation gate:** Approve visibility/consent flows before implementation; approve lifecycle evidence before Done.
  - **Scope / likely files:** `AdminExamsSection.jsx`, new admin course/re-exam components, `src/features/students/components/StudentsGradesSection4.jsx`, related student dashboard components, `adminApi.js`, `studentApi.js`, `admin.css`, `student.css`.
  - **Acceptance criteria:** Admin can triage failed students into Repeat/Re-exam/Special review and create a scoped re-exam; course roster shows eligibility, capacity, fees, payment, manual-add reason, and lifecycle status; student sees upcoming exams, published subject marks, average/rank/outcome, re-exam notice, course invitation with Accept/Decline/parent-confirmation/payment state, current/next class, and immutable promotion history; unpublished data is never rendered; all states work on mobile and with empty data.
  - **Dependencies:** `RES-01`, `RES-04`, `BE-04`, `BE-05`.
  - **Risk:** Showing eligibility before publication or showing guardian-only actions to a student can leak decisions or bypass consent.
  - **Verification:** Role-based component tests; main → re-exam and course offer → outcome browser scenarios; unpublished-data assertions; accessibility and responsive audit; manager approves lifecycle copy and visibility rules.

## Senior backend and database — 5 TODOs

- [ ] **BE-01 — Introduce the normalized academic/exam/course schema and safe migration boundary**
  - **Objective:** Move progression, exam configuration, standalone courses, payments, and promotion history into explicit school-scoped tables while preserving legacy records.
  - **Owner:** Senior Backend/Database 1.
  - **Manager confirmation gate:** Approve the ERD and migration boundary before implementation; approve reconciliation evidence before Done.
  - **Scope / likely files:** `server/db/schema/classes.js`, `server/db/schema/exams.js`, possibly new `server/db/schema/courses.js`, `server/db/schema/index.js`, new migrations after `0012`, migration metadata, `server/db/fixtures.js`, `hrn.sql` only if it remains an approved schema artifact.
  - **Acceptance criteria:** Schema supports `class_progressions`, onboarding/settings state, `exam_templates`, template subjects, sessions, assignments with maxima/deadlines, detailed scores/results, re-exam eligibility, standalone courses/classes/subjects/enrollments/payments, and append-only promotions/enrollment history; every tenant-owned row has `school_id` or a provably scoped parent; foreign keys, uniqueness, checks, and query indexes protect the stated invariants; legacy class progression/course columns remain readable during a defined compatibility window and are not dropped until backfill is verified.
  - **Dependencies:** `RES-01`, `RES-02`, `RES-04`; manager approves the entity relationship contract before migration generation.
  - **Risk:** A one-shot destructive migration could orphan published results, duplicate enrollments, or lose existing class progression.
  - **Verification:** Fresh migration plus upgrade from a fixture snapshot; pre/post row-count and relationship reconciliation; constraint tests for cross-school links, duplicate active enrollment, capacity, and invalid targets; manager reviews generated SQL.

- [ ] **BE-02 — Implement server-owned onboarding, Exam Settings, progression, and template APIs**
  - **Objective:** Provide authoritative, auditable endpoints for setup completion, editable settings, ordered progression, pass/rounding rules, and reusable exam templates.
  - **Owner:** Senior Backend/Database 2.
  - **Manager confirmation gate:** Approve endpoint and versioning contracts before implementation; approve API/audit evidence before Done.
  - **Scope / likely files:** new or extended routes under `server/routes/`, `server/app.js`, validation services, `server/db/schema/exams.js`, audit-log schema/use, `server/tests/api.test.js`.
  - **Acceptance criteria:** Admin-only mutations are school-scoped and validated; wizard drafts are resumable and completion is atomic; progression rejects cycles, duplicate order, missing final class, and cross-school classes; template versions preserve the exact rule set used by already-created exams; active/closed-year constraints are enforced server-side; every material change creates an audit event without logging sensitive payloads.
  - **Dependencies:** `BE-01`; decisions from `RES-01`; permission matrix from `RES-05`.
  - **Risk:** Editing a shared template in place could retroactively change published or collecting exam calculations.
  - **Verification:** API tests for roles, school isolation, resume/complete transitions, cycles, versioning, and closed years; transaction rollback injection; audit-log assertions; manager approves endpoint contract.

- [ ] **BE-03 — Implement template-based exam sessions, deterministic assignment generation, and deadline state**
  - **Objective:** Create exam sessions from a frozen template snapshot and generate the exact eligible class/subject/teacher assignments with maximum marks and deadlines.
  - **Owner:** Senior Backend/Database 3.
  - **Manager confirmation gate:** Approve assignment source/algorithm before implementation; approve deterministic-generation evidence before Done.
  - **Scope / likely files:** `server/routes/exams.routes.js`, possible exam service modules, `server/db/schema/exams.js`, subject/class-teacher sources in `server/db/schema/student-portal.js`, `server/tests/api.test.js`.
  - **Acceptance criteria:** Creation supports term, selected classes/All classes, date range, teacher deadline, manual publish, template snapshot, and per-subject maximum; generation is idempotent and rejects missing/ambiguous teacher ownership with actionable errors; roster eligibility is based on academic-year enrollment rather than mutable current class alone; server returns Draft/Submitted/Late and time data consistently; cancelled sessions retain history.
  - **Dependencies:** `BE-01`, `BE-02`, `RES-03`.
  - **Risk:** Current subjects/teacher assignments partly live in workspace JSON and partly in relational portal tables, so an incorrect source may generate incomplete assignments.
  - **Verification:** Deterministic generation tests across multiple classes/subjects; repeated-request idempotency; timezone/deadline tests; roster change tests; load test for 1,000 assignments; manager reviews generated-assignment evidence.

- [ ] **BE-04 — Build authoritative result calculation, publication, re-exam, and deferred promotion services**
  - **Objective:** Centralize calculations and publication in transactional services that preserve all attempts and apply promotion only at the manager-approved lifecycle point.
  - **Owner:** Senior Backend/Database 4.
  - **Manager confirmation gate:** Approve the signed academic policy and promotion event before implementation; approve golden results before Done.
  - **Scope / likely files:** refactor `server/routes/exams.routes.js` into services, `server/db/schema/exams.js`, academic-year routes, new result/re-exam/promotion modules, `server/tests/api.test.js`.
  - **Acceptance criteria:** Calculation stores subject scores, total possible/earned, configured rounding, average, tied rank, passed/failed subjects, outcome, and eligibility using the frozen rules; publish fails on incomplete or invalid assignments and is idempotent; re-exam includes only policy-approved students/subjects and never overwrites the original attempt; Repeat/Re-exam/Special review decisions are audited; promotion is queued or applied exactly at the approved event and cannot run twice.
  - **Dependencies:** `RES-01` policy record, `BE-01`, `BE-03`.
  - **Risk:** The current publish path immediately mutates `students.classId`; changing semantics without compatibility and reconciliation can double-promote existing students.
  - **Verification:** Golden calculation fixtures for boundaries, decimals, ties, per-subject failures, re-exam outcomes, and final classes; concurrent publish tests; forced rollback tests; historical-attempt assertions; manager signs off results from representative fixtures.

- [ ] **BE-05 — Implement standalone courses, offers/payments, capacity enforcement, and immutable transitions**
  - **Objective:** Replace class-embedded accelerated-course settings with a complete course lifecycle tied to academic year, eligibility, finance state, course exam, and target-class promotion.
  - **Owner:** Senior Backend/Database 5.
  - **Manager confirmation gate:** Approve finance/consent boundaries before implementation; approve lifecycle and concurrency evidence before Done.
  - **Scope / likely files:** new course schema/services/routes, `server/app.js`, integration with exam and academic-year services, `server/db/schema/finance.js` only after finance ownership is agreed, audit logging, `server/tests/api.test.js`.
  - **Acceptance criteria:** Admin can Draft/Open/Run/Complete a course with dates, duration, eligible classes, capacity, fee/payment type, eligibility thresholds, required subject marks, subjects, teachers, schedule, pass mark, and target class; automatic qualification and manual enrollment with reason are supported; acceptance/decline/parent confirmation/payment statuses are explicit; capacity and target existence are transactionally enforced; course failure preserves normal promotion while course success creates one accelerated transition; enrollment and promotion histories remain immutable.
  - **Dependencies:** `RES-04`, `BE-01`, `BE-04`; manager approval of finance/consent boundary.
  - **Risk:** Mixing course payment with the finance ledger without a shared contract can create contradictory “paid” states.
  - **Verification:** API lifecycle tests, concurrent last-seat enrollment test, qualification fixtures, payment-status contract test, success/failure promotion tests, history audit; manager approves course closure report.

## Senior bug-fix / QA — 5 TODOs

- [ ] **QA-01 — Close authorization, tenant-isolation, and object-ownership gaps across exam flows**
  - **Objective:** Prove that guessed IDs and cross-school relationships cannot expose or mutate setup, templates, assignments, scores, results, courses, or histories.
  - **Owner:** Senior Bug Fix/QA 1.
  - **Manager confirmation gate:** Approve the access matrix before test execution; approve zero unresolved high-severity findings before Done.
  - **Scope / likely files:** all new exam/course routes and services, `server/middleware/auth.middleware.js`, `server/tests/api.test.js`.
  - **Acceptance criteria:** Every read/write derives school and role from the authenticated user; teacher access is limited to assigned work, student/guardian access to linked students and published data, manager access is explicitly read-only or documented, and admin mutations reject cross-school IDs even through nested parents; failed access returns consistent 403/404 without data leakage.
  - **Dependencies:** Endpoint contracts from `BE-02`–`BE-05`; permission decisions from `RES-05`.
  - **Risk:** Child rows such as scores can appear safe while their parent assignment belongs to another school.
  - **Verification:** Parameterized two-school matrix covering every endpoint and nested ID; negative tests by role; log review for secrets/PII; manager reviews the completed access matrix.

- [ ] **QA-02 — Fix score bounds, missing-mark detection, deadline, lock, and reopen edge cases**
  - **Objective:** Eliminate hard-coded `/100` behavior and make assignment state transitions reliable under incomplete data and deadlines.
  - **Owner:** Senior Bug Fix/QA 2.
  - **Manager confirmation gate:** Approve the policy-based transition table before fixes; approve boundary/concurrency evidence before Done.
  - **Scope / likely files:** `server/routes/exams.routes.js`, result services, `TeachersExamsSection.jsx`, `AdminExamsSection.jsx`, admin/teacher API modules, tests.
  - **Acceptance criteria:** Each score validates against its stored subject maximum; decimal policy is consistently applied; a complete roster—not merely a matching row count—is required; empty/withdrawn/absent handling follows policy; submit after deadline is blocked or marked Late per `RES-01`; submit is idempotent; reopen requires a reason and re-locks correctly; published assignments cannot be mutated.
  - **Dependencies:** `RES-01`, `BE-03`, `BE-04`.
  - **Risk:** Roster changes during collection can make a previously complete sheet incomplete or assign marks to the wrong cohort.
  - **Verification:** Boundary/property tests for 0, max, max+epsilon, duplicates, missing and ineligible students; fake-clock state-transition tests; concurrent submit/reopen tests; manager approves transition table.

- [ ] **QA-03 — Prevent duplicate enrollment, double promotion, invalid progression, and course over-capacity**
  - **Objective:** Turn the business invariants in the plan into database constraints plus transaction-safe application guards.
  - **Owner:** Senior Bug Fix/QA 3.
  - **Manager confirmation gate:** Approve the invariant map before fixes; approve constraint and race-test evidence before Done.
  - **Scope / likely files:** progression/course/promotion schemas and services, academic-year and exam routes, migrations, `server/tests/api.test.js`.
  - **Acceptance criteria:** One active class enrollment per student/year; one effective transition per source event; no progression cycles or missing target; repeat publication/retry cannot promote twice; course seats never exceed capacity under concurrency; closed academic years reject exam/course/enrollment mutation; final classes complete without invalid target errors.
  - **Dependencies:** `BE-01`, `BE-04`, `BE-05`.
  - **Risk:** Application-only checks can race, while overly broad unique constraints can block legitimate historical attempts.
  - **Verification:** Concurrent transaction tests, database constraint tests, retry/idempotency tests, final-class and closed-year scenarios; manager reviews invariant-to-test traceability.

- [ ] **QA-04 — Validate legacy-data migration, compatibility reads, and rollback/reconciliation**
  - **Objective:** Guarantee that existing `0011` exam results, course enrollments, class settings, and current student classes survive the new model without reinterpretation.
  - **Owner:** Senior Bug Fix/QA 4.
  - **Manager confirmation gate:** Approve the legacy mapping before migration QA; approve the reconciliation/restore report before Done.
  - **Scope / likely files:** new migrations, fixture snapshots, reconciliation scripts/reports under `scripts/`, schema docs, migration tests.
  - **Acceptance criteria:** Migration has documented mapping for every legacy column/table; published results and original timestamps remain intact; unresolved or ambiguous rows are quarantined/reported rather than guessed; rerun is safe or explicitly prevented; compatibility period and rollback/restore procedure are documented; pre/post counts and aggregates reconcile.
  - **Dependencies:** `RES-02`, `BE-01`, `RES-05` rollout plan.
  - **Risk:** Legacy course enrollment currently points at classes and exams rather than a standalone course, so automatic conversion may invent unsupported meaning.
  - **Verification:** Restore an anonymized representative snapshot to a disposable database; execute migration; compare checksums/counts/sampled histories; rehearse restore; manager accepts reconciliation report before live rollout.

- [ ] **QA-05 — Run end-to-end regression, accessibility, responsive, performance, and release gates**
  - **Objective:** Validate the full lifecycle and protect existing admin, teacher, student, finance, and academic-year behavior before release.
  - **Owner:** Senior Bug Fix/QA 5.
  - **Manager confirmation gate:** Approve the release test plan before execution; issue final release confirmation before Done.
  - **Scope / likely files:** `server/tests/api.test.js`, `server/tests/frontend.test.js`, `server/tests/frontend-cases.jsx`, new focused tests, audit scripts, `README.md`, release checklist.
  - **Acceptance criteria:** Automated coverage includes onboarding → template → session → teacher draft/submit/late → admin reopen/monitor/publish → re-exam/course → year transition → student history; loading/error/empty/mobile/keyboard paths are covered; large school fixtures meet agreed response/render targets; `npm run check`, `npm test`, `npm run build`, and applicable audit commands pass; known limitations and operator recovery steps are documented.
  - **Dependencies:** `DES-01`–`DES-05`, `BE-01`–`BE-05`, `QA-01`–`QA-04`.
  - **Risk:** Existing tests are concentrated in one broad API file and shallow frontend rendering, which can miss real interaction regressions.
  - **Verification:** CI command logs, browser evidence for primary roles and breakpoints, accessibility report, performance sample, and release checklist; manager gives the final release confirmation.

## Research and gap analysis — 5 TODOs

- [ ] **RES-01 — Resolve the six blocking academic-policy decisions and publish a decision record**
  - **Objective:** Obtain authoritative answers for pass/fail basis, max-mark model, late submission, re-exam subjects, re-exam score treatment, and promotion timing.
  - **Owner:** Research/Gap Analysis 1.
  - **Manager confirmation gate:** Manager must obtain stakeholder answers and sign the decision record; unresolved choices block Done and all dependent implementation.
  - **Scope / likely files:** new `docs/EXAM_POLICY_DECISIONS.md`; input from school owner/academic lead; references from the supplied plan and current exam behavior.
  - **Acceptance criteria:** Each question has one chosen rule, examples including boundary cases, effective date, approver, and impact on schema/API/UI/tests; also define decimal rounding, absent/withdrawn handling, tied ranks, graduating classes, and Special review outcome; no downstream TODO retains an ambiguous placeholder.
  - **Dependencies:** Manager schedules and records stakeholder confirmation.
  - **Risk:** Implementing before policy approval can produce legally/academically incorrect published results.
  - **Verification:** Trace every policy decision to at least one acceptance test planned in `BE-04` or `QA-02`; manager and academic owner sign the decision record.

- [ ] **RES-02 — Produce a current-state data/feature gap and ownership inventory**
  - **Objective:** Map the requested entities and flows against what already exists in relational tables, workspace JSON, frontend state, fixtures, and migration `0011`.
  - **Owner:** Research/Gap Analysis 2.
  - **Manager confirmation gate:** Approve the inventory scope before research; confirm every supplied requirement is mapped before Done.
  - **Scope / likely files:** `server/db/schema/*.js`, `server/db/migrations/`, `server/routes/exams.routes.js`, `server/services/workspace.js`, admin/teacher/student components and data modules; output `docs/EXAM_GAP_ANALYSIS.md`.
  - **Acceptance criteria:** Matrix classifies every requested field/flow as existing, partial, missing, conflicting, or legacy; names the authoritative owner and migration action; identifies live-data distributions/nullable fields without exposing PII; highlights duplicate sources such as class details, workspace subjects, `portal_subjects`, and current student class versus enrollment history.
  - **Dependencies:** Read-only access to a representative anonymized dataset if available; otherwise explicitly label fixture-only conclusions.
  - **Risk:** Repository fixtures may not reflect production anomalies, leading to an unsafe migration plan.
  - **Verification:** Cross-check matrix against schema, API, and UI searches; sample database queries reviewed by backend lead; manager confirms every supplied requirement maps to a TODO.

- [ ] **RES-03 — Determine the authoritative subject, class, teacher, and timetable assignment source**
  - **Objective:** Decide how exam assignments are generated when the current system has workspace subject arrays and relational `portal_subjects`/`class_subjects` with schedule-level rows.
  - **Owner:** Research/Gap Analysis 3.
  - **Manager confirmation gate:** Approve the proposed source of truth and algorithm; no implementation starts while this remains unresolved.
  - **Scope / likely files:** `src/features/admin/components/AdminTeachersSubjectsSection.jsx`, workspace persistence, `server/db/schema/student-portal.js`, student portal routes, exam creation code; output `docs/EXAM_ASSIGNMENT_SOURCE.md`.
  - **Acceptance criteria:** Document a canonical data model, duplicate/override rules, active-status and date semantics, co-teacher handling, subjects without teachers, teacher replacement after session creation, and migration from workspace JSON; include the exact deterministic assignment-generation algorithm and error contract.
  - **Dependencies:** `RES-02`; academic/operations owner input.
  - **Risk:** Using timetable rows directly can duplicate a subject once per weekday, while using only workspace JSON can ignore server-backed assignments.
  - **Verification:** Run the proposed algorithm against fixture classes and at least five edge-case examples; compare expected assignment counts; manager approves the source-of-truth decision before `BE-03` starts.

- [ ] **RES-04 — Define the course, consent, capacity, payment, and finance integration contract**
  - **Objective:** Close gaps around standalone course ownership, invitation acceptance, parent confirmation, fees, payment status, refund/cancellation, and course completion.
  - **Owner:** Research/Gap Analysis 4.
  - **Manager confirmation gate:** Approve the finance/consent state machine with stakeholders; unresolved choices block `BE-05` and Done.
  - **Scope / likely files:** finance schema/routes, existing `courseEnrollments`, student/guardian account model, proposed course tables; output `docs/COURSE_POLICY_AND_FINANCE_CONTRACT.md`.
  - **Acceptance criteria:** Define who may offer/accept/confirm/pay, when a seat is reserved or released, capacity waitlist policy, payment types/statuses, whether payments are ledger-backed or informational, cancellation/refund behavior, eligibility recalculation, schedule/timezone, and what closes a course; identify integrations explicitly in or out of scope.
  - **Dependencies:** Finance owner, academic owner, and manager decisions; findings from `RES-02`.
  - **Risk:** Treating an informational payment flag as an accounting transaction can misstate revenue or enroll unpaid students.
  - **Verification:** State-machine walkthrough for accepted, declined, expired, unpaid, paid, cancelled, failed, and passed offers; finance/backend review; manager records approval before `BE-05`.

- [ ] **RES-05 — Define permissions, audit retention, rollout, observability, and operational recovery gaps**
  - **Objective:** Establish who can perform each high-impact action and how the school detects, explains, or recovers from failures after deployment.
  - **Owner:** Research/Gap Analysis 5.
  - **Manager confirmation gate:** Approve permissions and go/no-go controls; approve tabletop evidence before Done.
  - **Scope / likely files:** `server/middleware/auth.middleware.js`, system logs, deployment/README material, migration process, proposed monitoring; output `docs/EXAM_OPERATIONS_AND_PERMISSIONS.md`.
  - **Acceptance criteria:** Role/action matrix covers admin, manager, teacher, student, guardian, accountant, and superadmin; high-risk actions define confirmation, reason, immutable audit detail, and retention; rollout includes feature flag or staged activation, backup/restore, migration stop conditions, metrics/alerts for assignment backlog, late submissions, publish failures, and promotion anomalies; support runbook covers correction without direct database edits.
  - **Dependencies:** `RES-01` and `RES-04`; infrastructure capabilities confirmed by the manager.
  - **Risk:** Without operational controls, an academically correct feature can still publish bad results at scale with no safe recovery path.
  - **Verification:** Tabletop exercises for failed migration, mistaken publish, teacher deadline dispute, and duplicate promotion; audit-event sampling; manager approves go/no-go checklist.

## Suggested execution gates

1. **Policy gate:** complete and approve `RES-01`–`RES-05`.
2. **Foundation gate:** approve `BE-01` migration/ERD, then implement `BE-02` and `DES-01`/`DES-02` against stable contracts.
3. **Exam gate:** implement `BE-03`/`BE-04` with `DES-03`/`DES-04`, then clear `QA-01`–`QA-03` for those paths.
4. **Course gate:** implement `BE-05` and `DES-05` only after the finance/consent contract is approved.
5. **Release gate:** clear `QA-04` and `QA-05`; release only after the manager records final confirmation.
