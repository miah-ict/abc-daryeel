# RES-03 — Canonical exam assignment source and generation contract

Date: 2026-10-12  
Owner: Research/Gap Analysis 3  
Status: Proposed source/algorithm submitted for manager and academic/operations confirmation  
Dependency: `docs/EXAM_GAP_ANALYSIS.md`

## Decision proposed for approval

The canonical source must be **school-scoped relational academic offerings**, not workspace JSON and not raw timetable slots.

Use these concepts:

1. `subjects`: canonical school subject catalogue (evolve/rename current `portal_subjects`).
2. `class_subject_offerings`: one logical `(school, academic_year, class, subject)` offering, with Active/Inactive status and effective dates.
3. `offering_teachers`: effective-dated teachers for an offering, with role `Lead` or `CoTeacher` and an explicit priority only for display—not silent lead selection.
4. `timetable_slots`: zero or more weekly/date slots referencing one offering. Repeated weekdays never create extra exam assignments.
5. `exam_template_subjects`: ordered subject requirements and max/pass rules.
6. `exam_assignments`: immutable session snapshot of one class + one template subject + one lead teacher, with copied names/rules/deadline and optional co-teacher snapshot.

Current `portal_subjects` and `class_subjects` are the closest relational basis (`server/db/schema/student-portal.js:7-34`), but `class_subjects` currently mixes the logical offering with weekday/start time and permits one row per timetable slot. It must not be queried directly as “one row equals one exam assignment.” Workspace `abc-admin-subjects` is supplemental legacy input only (`server/services/workspace.js:124-152`), not an ongoing source after cutover.

## Why the current generator cannot remain

The current browser loops selected classes and workspace subjects, then selects the first teacher whose ID appears in the subject and whose optional `classIds` is empty or contains the class (`src/features/admin/components/AdminExamsSection.tsx:17-23`). The backend accepts the resulting free-text subject and verifies only that teacher/class belong to the school (`server/routes/exams.routes.js:37-43`). Consequences:

- array order silently chooses between co-teachers;
- an empty teacher `classIds` list means every class;
- a subject is not a relational FK and rename/history is unsafe;
- browser and server can generate different results from stale data;
- raw relational timetable rows can duplicate a subject for each weekday;
- no date-effective replacement or frozen teacher provenance exists.

## Canonical relational contract

Minimum target fields (final names may follow the `BE-01` ERD):

| Entity | Required fields / constraints |
|---|---|
| `subjects` | `id`, `school_id`, normalized/display name, status, effective dates; unique active normalized name per school. |
| `class_subject_offerings` | `id`, `school_id`, `academic_year_id`, `class_id`, `subject_id`, `status`, `effective_from`, `effective_to`; one active overlapping offering per year/class/subject. |
| `offering_teachers` | `offering_id`, `teacher_id`, `role`, `effective_from`, `effective_to`, `status`; tenant-safe FKs; at most one effective Lead at any instant. |
| `timetable_slots` | `offering_id`, weekday/date, start/end, room, status; unique slot identity; no exam-generation cardinality. |
| `exam_template_subjects` | versioned template ID, subject ID, order, maximum/pass minimum. |
| `exam_assignments` | session/class/template-subject IDs, subject and teacher IDs, copied display/rule snapshot, deadline, status; unique `(exam_session_id,class_id,template_subject_id)`. |
| `exam_assignment_teachers` | assignment, teacher, snapshotted role; one Lead, zero or more CoTeacher rows. |

All tenant-owned relationships must be database-safe, not merely route-checked. Teacher must be an Active teacher in the same school at resolution time. A class must be in the selected academic year/progression set. A subject can be offered without a timetable slot; schedule absence does not prevent an exam assignment.

## Exact deterministic generation algorithm

Inputs: authenticated admin, school ID from auth, idempotency key, active/writable academic year, frozen template version, explicit selected class IDs or server-expanded `All`, session start/end, teacher deadline, publish mode, and allowed per-session rule overrides.

Resolution instant: `session.start_at`. Effective intervals use half-open UTC semantics: `effective_from <= resolutionInstant < effective_to`; null `effective_to` means infinity. Dates displayed in Africa/Mogadishu do not alter stored UTC instants.

1. Begin one serializable (or equivalent locked/idempotent) transaction. Lock/read the idempotency record and academic-year/settings/template versions.
2. Validate session dates, deadline, writable year, school ownership, template status/version, and allowed overrides. Invalid scalar input returns `400` before generation.
3. Expand `All` to active classes in the approved year progression at the resolution instant. Explicit class IDs are deduplicated, school/year validated, and sorted by progression order then class ID. An empty result is an error.
4. Load template-subject rows in `subject_order, id` order. Reject an empty template. Validate every subject is active for the school and every stored maximum/rule snapshot is internally valid.
5. For every Cartesian pair `(selected class, template subject)`, load effective Active `class_subject_offerings` for exactly that year/class/subject.
   - zero offerings → issue `OFFERING_MISSING`;
   - more than one → issue `OFFERING_AMBIGUOUS`;
   - exactly one → continue.
6. Load effective Active teacher links for that offering and same-school Active user records.
   - exactly one `Lead` → select it;
   - zero Leads and exactly one eligible `CoTeacher` → **do not auto-promote**; issue `LEAD_TEACHER_MISSING`;
   - zero eligible teacher links → issue `TEACHER_MISSING`;
   - more than one effective Lead → issue `LEAD_TEACHER_AMBIGUOUS`.
   CoTeachers never generate separate exam assignments.
7. Apply an optional explicit session assignment override only if it names one same-school Active teacher already linked to that offering at the resolution instant, includes a reason, and the caller is authorized. The override is logged and snapshotted; it does not edit the offering. An invalid override is an issue, never a silent fallback.
8. Produce a preview row containing stable class/subject/offering/lead IDs, ordered co-teacher IDs, frozen max/pass rules, deadline, and roster count from Active academic-year enrollment. Timetable rows are not part of the count.
9. Sort preview rows by class progression/order + class ID, then template subject order + template-subject ID. This is the only insertion/display order contract.
10. If any issue exists, return the complete issue list and commit **zero** session/assignment rows. Preview may show valid candidates, but creation is atomic.
11. Otherwise insert the session/template/rule snapshot, explicit session classes, assignment rows, teacher snapshots, and frozen eligible roster rows. Unique keys plus the idempotency key make a byte-equivalent retry return the original session. A reused key with a different request hash returns conflict.
12. Write a structured audit event with source versions, counts, override IDs/reasons, and actor—never student marks.

## Duplicate, co-teacher, unassigned, replacement, and date rules

### Duplicates

- Subject identity is ID-based. Names are normalized only for migration matching; two active same-school normalized names are quarantined.
- Multiple timetable slots for one offering collapse to one assignment.
- Multiple active overlapping offerings for the same year/class/subject are an error, not “first row wins.”
- Duplicate selected class IDs are removed before generation; duplicate template subject rows are rejected by schema/version validation.
- The assignment unique key is `(session,class,template_subject)`, not subject name.

### Co-teachers

- One explicit effective Lead is mandatory.
- CoTeachers are copied to the assignment snapshot for visibility/delegated access only if permission policy allows; they do not multiply assignments.
- CoTeachers cannot submit/finalize unless the approved permission matrix grants it. RES-03 does not invent that authorization.
- More than one Lead is a blocking data error; priority/array order cannot resolve it.

### Subjects without teachers

- Preview returns `TEACHER_MISSING` or `LEAD_TEACHER_MISSING` with class/subject/offering IDs.
- Creation is all-or-nothing. Admin must fix the offering or enter a valid reasoned override, then retry.
- No placeholder teacher and no class-teacher fallback are allowed.

### Replacement after session creation

- The lead/co-teacher snapshot is immutable for the created assignment.
- A later offering replacement affects only sessions whose resolution instant is after the replacement effective time.
- Before any draft score exists, an admin may execute a dedicated `replace assignment teacher` command with reason; this appends an assignment-teacher history event and changes the active assignee, not the original snapshot/provenance.
- After any score/draft/submission exists, replacement requires the approved reopen/transfer workflow; it never regenerates or deletes the assignment.
- Editing the timetable or workspace JSON never changes an existing exam session.

### Dates and status

- Offering and teacher eligibility are resolved at `session.start_at` using half-open intervals.
- Session deadline determines Draft/Late/locked behavior separately; it does not choose the teacher.
- An offering active at start remains snapshotted even if it ends during the exam. If academic policy requires full-range coverage later, that is a versioned validation rule—not an implicit query change.
- Closed academic years reject creation/replacement regardless of current wall clock.

## Workspace JSON and current relational migration

Migration is staged and read-only until reviewed:

1. Export each school-scoped `abc-admin-subjects` array from the workspace. Validate object shape, unique ID, trimmed name, `teacherIds`, and referenced teacher ownership. Record rejects in a quarantine report. Workspace subjects are demonstrably school-scoped in API tests (`server/tests/api.test.js:149-176`), but their inner IDs are not relationally constrained.
2. Inventory relational `portal_subjects` and `class_subjects` per school. Current table definitions are at `server/db/schema/student-portal.js:7-34`; live distribution is unknown.
3. Match subject by same-school legacy ID first, then one unique normalized name. Never cross schools. Zero match creates a proposed canonical subject; multiple matches quarantine the row.
4. Convert distinct relational `(school,class,subject)` timetable groups into proposed offerings. Distinct effective teacher IDs become proposed offering-teacher links; repeated weekday slots stay timetable rows.
5. Use workspace mappings only to fill classes with no relational offering. Candidate classes come from each teacher's legacy `details.classIds`. An empty/missing `classIds` is **unscoped**, not “all classes,” during migration. It produces review-required candidates rather than committed offerings.
6. If workspace and relational sources disagree on teacher or subject identity, relational data is not blindly preferred: mark `SOURCE_CONFLICT`, show both anonymized IDs, and require academic/operations approval.
7. Require the reviewer to choose exactly one Lead for each offering; remaining valid teachers may become CoTeachers. No first-array-entry rule.
8. Reconcile counts: workspace subjects, canonical subjects, timetable groups, offerings, teacher links, unresolved/unscoped/quarantined rows, and expected session assignment counts for representative templates.
9. After manager approval, write canonical rows with legacy provenance IDs, switch admin subject/teacher UI to the relational API, then make workspace subject arrays read-only compatibility data. Remove them only after observation and restore rehearsal (`QA-04`).

## Error contract

Validation/generation errors use JSON and do not partially create a session:

```json
{
  "error": "Exam assignments could not be generated.",
  "code": "ASSIGNMENT_SOURCE_INVALID",
  "requestId": "opaque-id",
  "summary": {"selectedClasses": 2, "templateSubjects": 3, "candidates": 5, "issues": 1},
  "issues": [
    {
      "code": "LEAD_TEACHER_MISSING",
      "classId": "class-id",
      "subjectId": "subject-id",
      "offeringId": "offering-id",
      "candidateTeacherIds": ["teacher-id"],
      "message": "Choose one lead teacher for this class subject."
    }
  ]
}
```

Status/code rules:

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `SESSION_INPUT_INVALID` | Dates, deadline, empty class selection, maxima, or override shape invalid. |
| 403/404 | existing authorization/not-found contract | Caller/ID is unauthorized; do not reveal foreign-school existence. |
| 409 | `ACADEMIC_YEAR_CLOSED` | Year is not writable. |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Same key, different request hash. |
| 409 | `SOURCE_VERSION_CHANGED` | Previewed offering/template/settings versions changed before commit. |
| 422 | `ASSIGNMENT_SOURCE_INVALID` | Complete actionable issue list: offering/teacher/subject data cannot yield deterministic assignments. |

Allowed issue codes: `CLASS_NOT_IN_YEAR`, `SUBJECT_INACTIVE`, `OFFERING_MISSING`, `OFFERING_AMBIGUOUS`, `TEACHER_MISSING`, `LEAD_TEACHER_MISSING`, `LEAD_TEACHER_AMBIGUOUS`, `TEACHER_INACTIVE`, `SOURCE_CONFLICT`, `OVERRIDE_INVALID`. Issues are stably sorted by class order/ID, subject order/ID, then code.

## Deterministic edge examples and expected counts

The following are design tests against current fixture shapes plus constructed edges. “Committed” is zero whenever any blocking issue exists because creation is atomic.

| Example | Fixture/input | Expected preview candidates | Expected issues | Expected committed assignments |
|---|---|---:|---:|---:|
| 1. Current admin fixtures, before review | 3 classes (`server/db/adminSeed.js:28-32`) × 3 subjects, each with two teachers (`:17-21`); teachers have no `classIds` (`:11-16`) | 0 canonical candidates | 9 review-required missing-offering/unscoped-mapping issues; fixture-only | 0 |
| 2. Current portal API fixture | `portal-class-a` + `portal-reading` + one teacher/slot (`server/tests/api.test.js:444-455`), migrated as one offering with one Lead | 1 | 0 | 1 |
| 3. Repeated timetable weekdays | Same class/subject/Lead has Mon 08:00 and Wed 08:00 slots | 1 | 0 | 1 |
| 4. One Lead plus two CoTeachers | One offering with three effective links, exactly one role Lead | 1 | 0; teacher snapshot count 3 | 1 |
| 5. Two effective Leads | One offering with two Lead links at session start | 0 valid candidates for that pair | 1 `LEAD_TEACHER_AMBIGUOUS` | 0 |
| 6. Subject offered with no teacher | One offering, no effective teacher links | 0 | 1 `TEACHER_MISSING` | 0 |
| 7. Mixed All-classes coverage | Two selected classes × two template subjects; three valid pairs, one missing offering | 3 | 1 `OFFERING_MISSING` | 0 |
| 8. Teacher replacement | Lead A effective until Oct 15; Lead B from Oct 15. Session start Oct 10 resolves A; session start Oct 15 resolves B. | 1 per preview | 0 | 1 per distinct session; existing Oct 10 assignment remains A |
| 9. Duplicate selected IDs and duplicate timetable slots | Request `[class-a,class-a]`; subject has two schedule rows for same offering | 1 | 0 | 1 |
| 10. Fixture workspace/portal conflict | Workspace says teacher A, relational offering says teacher B for same normalized subject/class | 0 until reviewed | 1 `SOURCE_CONFLICT` during migration/preflight | 0 |

Automated acceptance for `BE-03` must encode at least examples 2–8, assert stable row/issue ordering, retry idempotency, no partial writes, and tenant isolation. Example 1 is explicitly fixture-only and demonstrates why legacy arrays cannot be auto-promoted to canonical truth.

A read-only local reference simulation of examples 2–7 was run on 2026-10-12. All six expected candidate/issue/atomic-commit counts passed: `1/0/1`, `1/0/1`, `1/0/1`, `0/1/0`, `0/1/0`, and `3/1/0`. This validates the documented counting rules only; it is not a substitute for the future `BE-03` database/API tests.

## Approval boundary

Manager approval of this document freezes the assignment-source decision and algorithm for `BE-03`; it does not approve teacher/co-teacher permissions, which remain governed by `RES-05`, nor academic max/deadline policies, which remain governed by `RES-01`. Academic/operations must specifically confirm the one-Lead rule, the treatment of unscoped legacy teacher mappings, and the session-start resolution instant.
