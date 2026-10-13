# RES-02 — Current-state exam data and feature inventory

Date: 2026-10-12  
Owner: Research/Gap Analysis 2  
Status: Submitted for manager confirmation  
Inputs: supplied Somali implementation brief, repository at this date, `docs/EXAM_GAP_AUDIT.md`, `docs/EXAM_IMPLEMENTATION_TODO_DRAFT.md`.

## Evidence boundary and data caveat

This inventory is based on source, SQL migrations, automated tests, and repository fixtures. No representative anonymized production database or live-data profile was supplied. Therefore every statement about row counts, null rates, duplicate distributions, unmatched names, or real tenant anomalies is **FIXTURE-ONLY / UNKNOWN IN LIVE DATA** unless explicitly described as a schema or code fact. The fixtures demonstrate possible shapes, not production prevalence.

Classification:

- **Existing** — implemented substantially as requested.
- **Partial** — a narrower prototype exists.
- **Missing** — no persistent/API/UI implementation was found.
- **Conflicting** — two sources or current behavior contradict the requested contract.
- **Legacy** — implemented only in the prototype location/shape that must remain readable during migration.

## Requirement-to-current-state matrix

### Class and first-run setup

| Requirement / requested fields or flow | State | Current owner and exact evidence | Migration / implementation action | Closure owner / TODO |
|---|---|---|---|---|
| Class form: name, education level, section, academic year, room, capacity only | Conflicting | UI also includes teacher, status, progression and course fields: `src/features/admin/components/AdminWorkspace.tsx:578-597`; payload repeats them at `:194-203`. Class identity extras are stored in `classes.details`: `server/routes/classes.routes.js:34-55`. | Preserve six identity fields; stop sending legacy academic controls; compatibility API must leave omitted legacy values unchanged until backfill is verified. | `DES-01`, `BE-01`, `BE-02`, `QA-04` |
| Remove next class, progression order, accelerated-course toggle, course rank limit, course pass mark from Class | Legacy / conflicting | Columns are first-class class attributes in `server/db/schema/classes.js:9-13`; API validates/writes them at `server/routes/classes.routes.js:10-23`, `:34-66`; cards render them at `src/features/admin/components/AdminClassesSection1.tsx:20`. | Backfill to versioned progression/course policy tables, dual-read during compatibility, then remove UI/write path; drop columns only at a later reconciled cutover. | `DES-01`, `BE-01`, `BE-02`, `QA-04` |
| One-time Exam Onboarding with resumable completion state | Missing | Exams page directly loads exams/years and shows Create Exam/empty state: `src/features/admin/components/AdminExamsSection.tsx:7-13`, `:30-35`; no exam onboarding state in `server/db/schema/exams.js:1-88`. | Add school-scoped draft/current-step/completed-at/completed-by/version state and atomic completion endpoint. | `DES-02`, `BE-01`, `BE-02` |
| Onboarding step 1: academic-year name/start/end/active | Partial | Relational academic years have name/start/end/status: `server/db/schema/exams.js:8-16`; create/start APIs: `server/routes/academic-years.routes.js:10-55`; UI is under Admin Settings, not Exams onboarding: `src/features/admin/components/AdminAcademicYears.tsx:10-63`. | Reuse relational years; integrate selection/creation into onboarding without duplicating year records. Add explicit active selection semantics to setup. | `DES-02`, `BE-02` |
| Step 2: ordered class progression and final/graduating class | Partial / legacy | Order and next class live on class; route prevents cycles only during a class update: `server/db/schema/classes.js:9-10`; `server/routes/classes.routes.js:18-23`. No final-class flag/version/year. | Add school/year-scoped progression set and edges/order/final flag; backfill legacy links and quarantine cycles/multiple predecessors/ambiguous gaps. | `BE-01`, `BE-02`, `QA-03`, `QA-04` |
| Step 3: pass/fail average, subject minimum, rounding | Partial / missing | Only `exams.pass_mark` exists: `server/db/schema/exams.js:29-40`; publish compares average to one threshold: `server/routes/exams.routes.js:126-144`. | Await `RES-01`; create versioned pass-rule set and immutable session snapshot including rounding and subject-minimum policy. | `RES-01`, `BE-01`, `BE-02`, `BE-04`, `QA-02` |
| Step 4: exam names/templates, max/fail marks, subjects, promotion, re-exam | Missing | Direct exam input only supports title/year/type/parent/passMark/assignments: `server/routes/exams.routes.js:9-10`; no template entities in `server/db/schema/exams.js:1-88`. | Add template/version/template-subject tables and archive semantics; snapshot template and subject rules on session creation. | `DES-03`, `BE-01`, `BE-02`, `BE-03` |
| Step 5: course on/off, duration, eligible classes, fee, capacity, eligibility, pass mark, target | Legacy / missing | Only class-level toggle/rank/pass and exam-attached enrollment exist: `server/db/schema/classes.js:11-13`; `server/db/schema/exams.js:75-88`. | Do not reinterpret automatically. Build standalone course/settings model after `RES-04`; quarantine ambiguous legacy course rows for reviewed mapping. | `RES-04`, `BE-01`, `BE-05`, `QA-04` |
| Persistent Exam Settings edits same onboarding configuration | Missing | No exam-settings route/table/component; academic years alone are under settings: `src/features/admin/components/AdminSettingsSection4.tsx:2`, `:57`. | Add versioned settings APIs; completed sessions retain frozen rule versions. | `DES-02`, `BE-02` |

### Requested entities and tables

| Requested entity | State | Current owner and exact evidence | Migration action | Closure owner / TODO |
|---|---|---|---|---|
| `academic_years` | Existing, constraints incomplete | `server/db/schema/exams.js:8-16`; migration `server/db/migrations/0011_exams_academic_years.sql:8-18`. | Preserve IDs/timestamps; add closed-year mutation guards and any tenant-safe composite keys/indexes. | `BE-01`, `BE-02`, `QA-03` |
| `class_progressions` | Missing; legacy columns | `server/db/schema/classes.js:9-10`. | Add versioned year-scoped progression rows; backfill and reconcile legacy order/edge values. | `BE-01`, `BE-02`, `QA-04` |
| exam setup/settings state | Missing | No corresponding export in `server/db/schema/index.js:1-9`. | Add school-owned versioned setup/rules/completion records. | `BE-01`, `BE-02` |
| `exam_templates` | Missing | No table in `server/db/schema/exams.js:1-88`. | Add versioned template header/category/visibility/promotion/re-exam policy. | `BE-01`, `BE-02` |
| `exam_template_subjects` | Missing | Current assignment stores free-text `subject_name`: `server/db/schema/exams.js:43-52`. | Add subject FK, order, max, pass minimum; snapshot into session subjects. | `BE-01`, `BE-02`, `BE-03` |
| `exams` / exam sessions | Partial | Header has school/year/title/type/parent/pass/status: `server/db/schema/exams.js:29-41`. Missing template version, term, dates, deadline, publish mode, rule snapshot. | Expand or introduce session tables additively; preserve prototype exam IDs and published timestamps. | `BE-01`, `BE-03`, `QA-04` |
| session classes | Missing | Selected classes are implicit in assignment rows; Main uses all client classes: `src/features/admin/components/AdminExamsSection.tsx:17-23`. | Add explicit ordered session-class rows and selected/all selection audit. | `BE-01`, `BE-03` |
| `exam_assignments` | Partial | Has exam/class/free-text subject/teacher/status/submitted/reopened: `server/db/schema/exams.js:43-52`. | Add school/subject/template-subject/max/deadline/late/snapshot fields; retain legacy subject text for compatibility. | `BE-01`, `BE-03`, `QA-02` |
| assignment roster snapshot | Missing | Roster is calculated from mutable students/current class or parent results at read/publish time: `server/routes/exams.routes.js:49-64`, `:117-128`. | Add session/assignment candidate snapshot from academic-year enrollments with include/exclude/withdrawn state. | `BE-01`, `BE-03`, `QA-02` |
| `exam_scores` | Partial | Assignment/student/integer score only: `server/db/schema/exams.js:54-60`; route hard-bounds 0–100: `server/routes/exams.routes.js:9`. | Preserve rows; add decimal/bounds/absence/version provenance per approved policy, or migrate to detailed attempt score table. | `BE-01`, `BE-04`, `QA-02`, `QA-04` |
| detailed subject results | Missing | Result only stores average/rank/outcome/promotion: `server/db/schema/exams.js:62-73`. | Materialize immutable per-subject earned/possible/pass state tied to attempt and frozen rules. | `BE-01`, `BE-04` |
| `exam_results` / attempts | Partial | `server/db/schema/exams.js:62-73`; unique exam/student. | Preserve every prototype row/timestamp; add totals, passed/failed counts, rule version, attempt linkage, calculation version. | `BE-01`, `BE-04`, `QA-04` |
| `re_exam_eligibilities` | Missing | Eligibility is encoded as `exam_results.failed_decision='Re-exam'`: `server/routes/exams.routes.js:189-197`; roster filters that flag at `:61-63`. | Add parent attempt plus student/subject eligibility and resolution status; backfill only explicit Re-exam decisions. | `BE-01`, `BE-04`, `QA-04` |
| `courses` | Missing | No course header; only enrollment tied to a main exam: `server/db/schema/exams.js:75-88`. | Add standalone course; do not infer name/dates/fee/capacity from class prototype. | `RES-04`, `BE-01`, `BE-05` |
| `course_classes` / eligible classes | Missing | Prototype uses `source_class_id`, `course_class_id`, `target_class_id`: `server/db/schema/exams.js:80-82`. | Map reviewed legacy class roles to new course eligibility/target rows; quarantine ambiguous records. | `RES-04`, `BE-01`, `QA-04` |
| `course_subjects` | Missing | Course exam uses ordinary exam assignments; no course subject ownership. | Add ordered subject/teacher/max/pass snapshot. | `BE-01`, `BE-05` |
| course teachers/schedule | Missing | No course schedule/teacher entities. | Add course teaching/schedule rows with effective dates and tenant ownership. | `BE-01`, `BE-05` |
| `course_enrollments` | Partial / legacy | Prototype table has source/course/target class, source/reason/status/score: `server/db/schema/exams.js:75-88`. | Preserve row IDs/data as legacy provenance; attach only after reviewed course reconstruction, otherwise quarantine. | `BE-01`, `BE-05`, `QA-04` |
| course offers/consent/waitlist | Missing | No schema/routes; admin only manually inserts enrollment: `server/routes/exams.routes.js:206-220`. | Implement after `RES-04` state machine; do not overload enrollment status. | `RES-04`, `BE-05`, `DES-05` |
| `course_payments` | Missing | No course payment link in exam or finance schemas/routes. | Follow approved finance ownership; use ledger-backed reference or explicitly informational state, never both implicitly. | `RES-04`, `BE-05` |
| `student_promotions` | Missing | Publication directly mutates student and inserts enrollment: `server/routes/exams.routes.js:137-149`. | Add append-only, idempotent transition ledger with source event/effective year/actor/status. Backfill result destinations as proposed events, not assumed applied truth without reconciliation. | `BE-01`, `BE-04`, `QA-03`, `QA-04` |
| `student_enrollment_history` | Partial / conflicting | `student_enrollments` exists, but uniqueness allows several classes/year and rows are not closed: `server/db/schema/exams.js:18-27`; `students.class_id` is another current pointer: `server/db/schema/students.js:5-18`. | Establish one active enrollment invariant/effective dates; reconcile `students.class_id`; retain all history. | `BE-01`, `QA-03`, `QA-04` |
| audit logs | Partial | Exam create/submit/reopen/publish/decision/manual enroll log actions: `server/routes/exams.routes.js:43`, `:92`, `:103`, `:154`, `:195`, `:218`; log detail is plain text: `server/db/schema/workspace.js:9-14`. | Define immutable structured before/after/provenance and retention without sensitive mark payloads. | `RES-05`, `BE-02`–`BE-05`, `QA-01` |

### Exam creation, teacher submission, monitoring, and publication

| Requested flow / field | State | Current owner and exact evidence | Migration / implementation action | Closure owner / TODO |
|---|---|---|---|---|
| Choose template | Missing | Creation form has no template: `src/features/admin/components/AdminExamsSection.tsx:34`. | Template selection and frozen version required. | `DES-03`, `BE-02`, `BE-03` |
| Academic year | Existing | Form/API/schema: `src/features/admin/components/AdminExamsSection.tsx:34`; `server/routes/exams.routes.js:9-10`; `server/db/schema/exams.js:32`. | Reject closed year and snapshot rule/progression versions. | `BE-02`, `BE-03`, `QA-03` |
| Term, start date, end date | Missing | Not in exam input/schema: `server/routes/exams.routes.js:9-10`; `server/db/schema/exams.js:29-41`. | Add validated dates/term and timezone contract. | `DES-03`, `BE-03` |
| Selected classes / All classes | Conflicting | Main sessions always use every client-side class: `src/features/admin/components/AdminExamsSection.tsx:19-23`. | Explicit selection submitted by IDs; validate active/year scope server-side. | `RES-03`, `DES-03`, `BE-03` |
| Per-subject maximum | Missing / conflicting | Global input says pass mark; scores fixed to 100: `src/features/admin/components/AdminExamsSection.tsx:34`; `server/routes/exams.routes.js:9`. | Store template/session-subject maximum and validate score against snapshot. | `RES-01`, `BE-03`, `QA-02` |
| Teacher submission deadline | Missing | No deadline column/status: `server/db/schema/exams.js:43-52`. | Add UTC deadline plus display timezone and server-derived deadline status. | `RES-01`, `BE-03`, `QA-02` |
| Manual publish mode | Partial | Publication is explicitly triggered by admin, but mode is not persisted: `src/features/admin/components/AdminExamsSection.tsx:25`, `:36`; `server/routes/exams.routes.js:107-157`. | Persist publish mode; only manual supported initially if approved. | `BE-03`, `BE-04` |
| Automatic assignment by class/subject/teacher | Conflicting | Browser generates rows from workspace JSON subjects/teacher metadata: `src/features/admin/components/AdminExamsSection.tsx:17-23`; backend accepts names and checks only school/role: `server/routes/exams.routes.js:37-43`. | Adopt `docs/EXAM_ASSIGNMENT_SOURCE.md`; generate and preview server-side from canonical relational offerings. | `RES-03`, `BE-03`, `QA-04` |
| Teacher page: exam/class/subject/status | Partial | List/details exist: `src/features/teachers/components/TeachersExamsSection.tsx:13-14`. | Bind to relational subject/snapshot and expand status metadata. | `DES-04`, `BE-03` |
| Teacher page: max/deadline/time remaining/student count/Late | Missing except roster visible | UI hardcodes `/100`; no deadline/time/Late: `src/features/teachers/components/TeachersExamsSection.tsx:14`. | Server returns maximum, deadline, seconds/status, roster count; UI displays server state. | `DES-04`, `BE-03`, `QA-02` |
| Scores 0..configured max and missing detection | Partial / conflicting | Server accepts 0..100 and submit compares score-row count to roster count: `server/routes/exams.routes.js:9`, `:85-95`. | Validate exact roster IDs, decimals/absence policy, per-assignment maximum; freeze roster. | `BE-03`, `BE-04`, `QA-02` |
| Save Draft, Final Submit, confirmation, lock | Existing / partial | Save/submit/lock exists: `server/routes/exams.routes.js:72-95`; confirmation/UI: `src/features/teachers/components/TeachersExamsSection.tsx:10-14`. | Make submit idempotent and deadline-aware; persist submission event/version. | `DES-04`, `BE-03`, `QA-02` |
| Admin reopen with reason | Existing / partial | `server/routes/exams.routes.js:98-105`; prompt in `src/features/admin/components/AdminExamsSection.tsx:27`. | Structured reason/actor/history; deadline/closed-year guard and relock semantics. | `DES-04`, `BE-03`, `QA-02` |
| Deadline becomes Late / missing teacher alert | Missing | Only Draft/Submitted statuses: `server/db/schema/exams.js:49-51`. | Server-derived Late/Overdue and monitoring projection. | `RES-01`, `DES-04`, `BE-03` |
| Overall/class completion %, submitted/pending/late, teacher, deadline, missing marks | Partial | API/UI expose only submitted/total and per-class counts: `server/routes/exams.routes.js:18-28`; `src/features/admin/components/AdminExamsSection.tsx:14-16`, `:35-37`. | Add readiness endpoint/projection with counts and publish blockers. | `DES-04`, `BE-03`, `QA-02` |
| Publish only at 100%, results hidden until publish | Existing / partial | Server requires all assignments submitted and checks marks: `server/routes/exams.routes.js:107-129`; student endpoint filters published exams: `:170-178`. | Preserve server gate; expand completeness policy and make publish idempotent. | `BE-04`, `QA-02` |

### Results, re-exams, courses, promotion, and student experience

| Requested field / flow | State | Current owner and exact evidence | Migration / implementation action | Closure owner / TODO |
|---|---|---|---|---|
| Subject score, total, average, rank | Partial | Scores and average/rank exist separately: `server/db/schema/exams.js:54-73`; publish averages scores equally: `server/routes/exams.routes.js:126-144`. Total possible/earned absent. | Create immutable attempt + subject-result snapshot with totals/calculation version. | `BE-04`, `QA-02` |
| Passed/failed subjects | Missing | Result has only overall outcome: `server/db/schema/exams.js:62-73`. | Derive/store using approved subject minimum policy. | `RES-01`, `BE-04` |
| Overall outcome | Partial | Average threshold only: `server/routes/exams.routes.js:136-144`. | Apply frozen approved rules, absence and rounding policies. | `RES-01`, `BE-04` |
| Promotion/re-exam/course eligibility | Partial / conflicting | Promotion and course enrollment happen during publish; re-exam is manual result flag: `server/routes/exams.routes.js:137-150`, `:189-220`. | Separate eligibility facts from decisions and applied transitions. | `BE-04`, `BE-05`, `QA-03` |
| Failed triage: Repeat/Re-exam/Special review | Partial | Repeat and Re-exam only: `server/routes/exams.routes.js:189-197`; UI at `src/features/admin/components/AdminExamsSection.tsx:37`. | Add Special review state/workflow after policy approval. | `RES-01`, `DES-05`, `BE-04` |
| Re-exam only eligible students/failed subjects | Partial | Eligible student roster exists; no per-subject eligibility: `server/routes/exams.routes.js:35-36`, `:61-63`. | Add student-subject eligibility and attempt linkage. | `RES-01`, `BE-04`, `QA-02` |
| Preserve original and re-exam | Partial | Separate exam/result rows preserve both, but no resolution link/policy: `server/db/schema/exams.js:29-40`, `:62-73`. | Preserve IDs/timestamps; link attempts and final resolution without overwrite. | `BE-04`, `QA-04` |
| Standalone course information/lifecycle | Missing | Prototype roster only: `server/routes/exams.routes.js:199-220`. | Implement only after `RES-04`; keep legacy read-only until mapped. | `RES-04`, `BE-05`, `DES-05` |
| Automatic qualifiers/manual add with reason | Partial | Rank-based auto and manual reason exist: `server/routes/exams.routes.js:147-150`, `:206-220`. | Rebuild against standalone course eligibility/capacity; preserve source/reason. | `BE-05`, `QA-03` |
| Capacity, target validation, payment/status, close | Missing / partial | Route checks successor existence but not capacity/payment/course close: `server/routes/exams.routes.js:214-220`. | Transactional capacity/target/state machine and approved finance contract. | `RES-04`, `BE-05`, `QA-03` |
| Normal promotion fallback after course failure | Incidental / partial | Main publish already moves passed student to next class; failed course leaves that pointer unchanged: `server/routes/exams.routes.js:137-149`. | Make fallback explicit and tested through transition ledger; do not depend on incidental mutation order. | `BE-04`, `BE-05`, `QA-03` |
| Prevent double class/double promotion/invalid target/closed-year edit | Missing or application-only | Enrollment uniqueness is too weak: `server/db/schema/exams.js:18-27`; closed-year guards absent from exam mutations; next-class has no FK: `server/db/schema/classes.js:9-10`. | Add DB constraints and idempotency keys plus transactional guards. | `BE-01`, `QA-03` |
| Student upcoming exams/timetable | Missing | Student result endpoint returns published results only: `server/routes/exams.routes.js:170-178`. | Add published/visible session schedule read model. | `DES-05`, `BE-03`, `BE-04` |
| Student subject marks, average/rank/pass-fail | Partial | UI shows exam average/rank/outcome only: `src/features/students/components/StudentsGradesSection4.tsx:7-15`; portal separately averages published scores by subject name: `server/routes/student-portal.routes.js:105-117`. | Use canonical subject-result rows; eliminate name-based aggregation. | `DES-05`, `BE-04` |
| Re-exam notice and course eligibility/invitation/details/result | Missing | No student course/re-exam offer endpoint/UI; result table only: `src/features/students/components/StudentsGradesSection4.tsx:14`. | Add role-scoped offers/notices after result publication. | `DES-05`, `BE-04`, `BE-05`, `QA-01` |
| Accept/Decline/parent confirmation/payment | Missing | No entities/routes/UI. | Implement approved `RES-04` consent/finance state machine. | `RES-04`, `DES-05`, `BE-05` |
| Current/next class and promotion history | Partial / conflicting | Current `students.class_id` plus active enrollments returned by portal: `server/routes/student-portal.routes.js:46-65`; no transition history UI. | Read authoritative enrollment and append-only transitions; display applied/pending history. | `DES-05`, `BE-04`, `BE-05` |

### Safety, ownership, migration, and tests

| Requirement | State | Evidence | Action | Closure owner / TODO |
|---|---|---|---|---|
| School/tenant ownership | Partial | Route validates school classes/teachers: `server/routes/exams.routes.js:37-43`; most child tables lack `school_id`/composite ownership: `server/db/schema/exams.js:43-73`. | Add tenant-safe parent/composite constraints and negative nested-ID tests. | `BE-01`, `QA-01` |
| Existing-data migration without losing results | Missing beyond prototype migration | `0011` creates prototype and only maps `students.class_id` by normalized class name: `server/db/migrations/0011_exams_academic_years.sql:1-99`. | Add additive backfill, quarantine, count/checksum reconciliation, compatibility reads, restore rehearsal. | `RES-02`, `BE-01`, `QA-04`, `RES-05` |
| Backend/database/frontend tests | Partial | One broad lifecycle: `server/tests/api.test.js:255-304`; frontend mainly render checks: `server/tests/frontend.test.js:15-33`. | Add policy, isolation, constraints, concurrency, migration, interaction, a11y and end-to-end matrices. | `QA-01`–`QA-05` |

## Duplicate sources of truth

| Concept | Sources today | Conflict |
|---|---|---|
| Current class | `students.class_id`, `students.grade_level`, `student_enrollments` | Pointer/text/history can disagree; multiple active enrollment rows are allowed. |
| Class attributes | relational columns plus `classes.details` plus legacy workspace class arrays | `schoolClasses` can migrate legacy workspace rows into relational details: `server/services/workspace.js:42-65`; field meaning can remain hidden in JSON. |
| Subject catalogue | `abc-admin-subjects` workspace JSON and relational `portal_subjects` | Independent IDs/names/status; no sync path. |
| Class-subject-teacher | workspace subject `teacherIds`, teacher detail `classIds`, relational timetable `class_subjects` | Browser generation and student portal can disagree; timetable can repeat a subject by weekday. |
| Scores shown to student | official exam scores/results and portal name-based subject average | Name matching can merge distinct subjects or split renamed ones: `server/routes/student-portal.routes.js:105-117`. |
| Progression/course policy | class columns and result/course side effects | Not versioned by academic year; historic meaning changes when class rows change. |

## Fixture-only observations requiring live preflight

1. **FIXTURE-ONLY:** `server/db/adminSeed.js:17-21` defines three subjects, each with two teachers, but `initialTeachers` at `:11-16` has no class scope. Current browser logic therefore treats each listed teacher as eligible for every class and chooses the first array match.
2. **FIXTURE-ONLY:** `server/db/adminSeed.js:28-32` has three classes with no progression/course fields; it does not exercise legacy backfill ambiguity.
3. **FIXTURE-ONLY:** portal relational subject/schedule data is inserted inside the API test (`server/tests/api.test.js:442-455`); `server/db/seed.js:10-33` seeds only a superadmin, so repository seed code does not establish live academic relational data.
4. **UNKNOWN IN LIVE DATA:** frequency of duplicate normalized subject/class names, missing teacher IDs, foreign-school IDs inside workspace JSON, duplicate active enrollments, unmatched `grade_level`, and ambiguous course rows.

Required read-only production-shaped preflight before migration approval: per-school normalized duplicate names; JSON shape/type validation; referenced-ID ownership; distinct class/subject/teacher mappings; schedule duplicates; active-enrollment duplicates; null/current-class disagreement; legacy exam/result/course counts and orphan checks. Output must be anonymized aggregate counts plus quarantined record IDs, never names/marks.

## RES-02 conclusion

Every requested area is mapped above. The safe boundary is additive: preserve prototype exam/result IDs and timestamps, move configuration into versioned school/year-owned tables, establish canonical relational subject offerings, snapshot session rules/rosters/teachers, and quarantine rather than guess ambiguous legacy rows. Implementation is blocked from treating fixture shapes as production truth.

