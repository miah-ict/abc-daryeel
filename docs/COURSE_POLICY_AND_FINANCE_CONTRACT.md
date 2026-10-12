# Course Policy, Consent, Capacity, and Finance Contract

Status: **Wave 1 research/specification — manager review required**  
Owner: **RES-04 / Research and Gap Analysis 4**  
Scope: standalone accelerated courses, invitations, consent, seats, payment ownership, cancellation/refund, waitlist, course exam, and promotion boundary. This document does not change product code.

## 1. Decision notation

- **FACT** — directly evidenced by the current repository.
- **RECOMMENDED DEFAULT** — proposed behavior that is safe and consistent with the current architecture, but is not an approved product decision.
- **PENDING STAKEHOLDER DECISION** — must be answered by the named owner before `BE-05` or dependent UI is implemented.

No recommended default in this document is permission to implement it. The manager must record the stakeholder decision and approval.

## 2. Evidence-backed current state

| Evidence-backed fact | Repository evidence | Consequence |
| --- | --- | --- |
| **FACT:** accelerated courses are not standalone entities. | `server/db/schema/exams.js` defines only `course_enrollments`, tied to a parent `exam_id`, a source class, ordinary “course class,” and target class. | Course name, dates, capacity, fee, schedule, consent, payment, and lifecycle cannot be represented authoritatively today. |
| **FACT:** main-exam publication automatically creates course enrollments from class rank settings. | `server/routes/exams.routes.js` inserts `courseEnrollments` when a passing student's rank is within `classes.courseRankLimit`. | Current behavior skips offer/acceptance, parent confirmation, payment, capacity, and a waitlist. |
| **FACT:** admins can manually add a student to the prototype course roster with a reason. | `POST /api/exams/:id/courses` is admin-only and writes `source: 'Manual'` plus `reason`. | A future manual-add flow should preserve reason and actor but must not bypass consent, capacity, or payment policy. |
| **FACT:** course exam publication updates course status and can immediately move the student's current class to the target class. | `server/routes/exams.routes.js` updates `courseEnrollments`, `students.classId`, and `studentEnrollments` during publish. | The normal-promotion fallback and accelerated transition are not separated into an immutable transition ledger. |
| **FACT:** finance records are school-scoped and finance routes allow only `accountant` and `superadmin`; a schoolless superadmin is rejected by `financeSchoolId`. | `server/routes/finance*.js`, `server/routes/finance-core.js`. | Admin must not directly mark a course fee paid. Course APIs should consume a finance-owned payment view or event. |
| **FACT:** existing collections are invoice/transaction/receipt based, use idempotency keys, and reject writes in closed periods. | `server/db/schema/finance.js`; `server/routes/finance.routes.js`; `assertOpenFinancePeriod` in `server/routes/finance-core.js`. | Paid course fees should reuse finance posting semantics instead of adding an unaudited boolean. |
| **FACT:** receipts prove that a collection was recorded; they do not initiate or verify an external bank/mobile transfer. | `README.md` production limits. | “Paid” must mean recorded/posted by finance, not merely claimed by a learner/admin. |
| **FACT:** refunds are reversing transactions linked to the original collection and cannot exceed the unrefunded amount. | `finance_refunds`, `transactions.sourceTransactionId`, `POST /api/finance/refunds`. | Course refunds should reference the course invoice/payment but remain finance-owned. |
| **FACT:** no separate guardian role exists. Public guardian accounts use role `student` and obtain linked children through `students.parentId`; a learner may also match `students.id === user.id`. | `server/db/schema/users.js`, `README.md`, `GET /api/exams/results/me`. | “Student acceptance” and “parent confirmation” require actor-type rules inside the student/guardian surface, not a nonexistent `guardian` RBAC value. |
| **FACT:** currency is currently fixed to USD in finance validation/settings. | `financeSettings.currency`; `settingsInput` requires literal `USD`. | Course fee currency must initially be USD or remain pending until finance supports more currencies. |

## 3. Recommended domain boundaries

### 3.1 Ownership

| Domain object/action | Recommended authoritative owner |
| --- | --- |
| Course definition, eligibility rules, academic schedule, target class | Academic domain; admin mutation, manager read/review |
| Offer, consent, enrollment, waitlist, attendance/completion | Course domain; role-specific transitions with immutable actor/time/reason |
| Invoice, posted payment, receipt, refund, waiver approval | Finance domain; accountant mutation, school-scoped; course domain consumes status only |
| Course exam, result, accelerated promotion | Exam/promotion domain; admin publish after academic prerequisites |
| Guardian relationship | Existing student/account relationship; must be resolved from server-side links, never a client-provided child ID alone |

**RECOMMENDED DEFAULT:** introduce a stable `course_id` and keep financial documents linked by an explicit source reference such as `{sourceType: 'CourseEnrollment', sourceId: enrollmentId}` or relational equivalent. Do not duplicate amounts, receipts, or “paid” booleans as independent truth in the course table.

### 3.2 Minimum proposed records

This is a contract input for `BE-01`, not a frozen ERD:

- `courses`: school, academic year, name/description, start/end, duration, capacity, fee, payment type, eligibility snapshot/version, pass rule, target class, lifecycle.
- `course_eligible_classes`, `course_required_subject_marks`, `course_subjects`, `course_teachers`, `course_schedule`.
- `course_offers`: course, student, source eligibility result or manual-add reason, status, offered/expiry timestamps, actor trail.
- `course_consents`: offer, actor user, actor type (`Learner`, `Guardian`, `AdminOverride` only if approved), decision, timestamp, policy/version.
- `course_enrollments`: accepted seat-bearing record, source class, normal-promotion class, target class, lifecycle, unique school/course/student constraint.
- `course_waitlist`: course, student, stable sequence/accepted-at order, status, promotion-to-seat timestamp.
- `course_finance_links`: enrollment, invoice, required amount, derived payment state; no independent posted amount.
- `course_transitions`: append-only offer/enrollment/course/promotion events with actor, reason, source event, and timestamp.

Tenant-safe composite ownership constraints, capacity-safe transactions, and immutable academic/financial snapshots are mandatory implementation requirements.

## 4. State machines

### 4.1 Course lifecycle

```text
Draft ──approve/open──> Open ──start──> Running ──finish & reconcile──> Completed
  │                      │                 │
  └────cancel────────────┴────cancel───────┴────cancel/terminate────> Cancelled
```

| Transition | Required guard | Side effects |
| --- | --- | --- |
| Draft → Open | dates valid; capacity > 0; target class exists in same school; eligibility/pass/fee rules frozen; subjects/teachers policy satisfied | Start eligibility evaluation and allow offers. |
| Open → Running | start condition reached; enrolled roster frozen or explicitly versioned; unresolved payment/consent policy satisfied | Stop ordinary offer edits; keep waitlist behavior only if policy permits late entry. |
| Running → Completed | course exam/results finalized; all enrollment outcomes resolved; finance exceptions reported, not silently rewritten | Permit accelerated promotion at the approved promotion event. |
| Any mutable state → Cancelled | admin reason; finance impact preview; manager confirmation for Running cancellation recommended | Cancel offers, release seats, start finance-owned refund/credit workflow where applicable; never delete history. |

**RECOMMENDED DEFAULT:** course definitions are editable only in Draft. In Open, only non-semantic display/schedule corrections are allowed and audited; eligibility, fee, capacity, pass mark, and target changes create a new version or require closing/reissuing offers.

### 4.2 Offer, consent, seat, and enrollment lifecycle

```text
Eligible/ManualCandidate
        │ issue offer
        v
      Offered ──decline/expire──> Declined | Expired
        │ accept
        v
 ConsentPending ──guardian declines/expires──> Declined | Expired
        │ consent complete
        v
 PaymentPending / SeatHeld ──deadline expires──> Released ──policy──> Waitlisted or Closed
        │ payment not required, waived, or posted
        v
      Enrolled ──withdraw/cancel──> Withdrawn | Cancelled
        │ course starts/completes
        v
      Running ──result──> Passed | Failed | Incomplete
```

#### Seat accounting

**RECOMMENDED DEFAULT:**

1. `Offered` and `ConsentPending` do **not** consume capacity.
2. A completed consent/acceptance transaction attempts to create `SeatHeld` under a locked course-capacity row.
3. `SeatHeld`, `Enrolled`, and `Running` count against capacity.
4. If no seat exists, acceptance creates `Waitlisted`; it never overbooks.
5. A seat hold has a configurable expiry. Proposed starting default: **72 hours**, explicitly **PENDING**.
6. Decline, expiry, withdrawal before start, rejected/expired payment, or course cancellation releases the seat in the same transaction.
7. Seat release promotes the first eligible waitlist entry by deterministic order and creates a fresh offer/hold deadline; it never silently enrolls the student.
8. Manual adds use the same capacity lock and waitlist behavior as automatic offers.

#### Waitlist ordering

**RECOMMENDED DEFAULT:** order by successful acceptance timestamp, then immutable offer ID as a tie-breaker. Manual priority changes require admin reason and create an audit event; hidden priority changes are prohibited.

### 4.3 Payment lifecycle and ownership

```text
NotRequired

Required ──invoice issued by finance──> Invoiced ──partial post──> PartiallyPaid
                                            │                       │
                                            └──full post────────────┴──> Paid

Invoiced/PartiallyPaid ──approved waiver/credit──> Waived | Settled
Paid/PartiallyPaid ──finance reversal──> PartiallyRefunded | Refunded
Invoice ──void before posting──> Voided
```

**RECOMMENDED DEFAULT payment ownership:**

- Admin configures whether a course is free or fee-bearing and the required amount while the course is Draft.
- Opening a fee-bearing course creates or requests finance-compatible charge definitions; it does not post income.
- Acceptance/seat hold requests an invoice. Only accountant/school-scoped finance APIs can record payment, create receipts, waive (if a waiver role is approved), or refund.
- Course enrollment reads a derived settlement status from the linked invoice and posted transactions.
- Admin may see amount/status/receipt reference needed for operations, but cannot set `Paid` manually.
- External mobile/bank settlement remains unverified until an accountant records it under the current system.
- A course invoice/payment/refund inherits finance closed-period, idempotency, school ownership, receipt, and reversal rules.

**PENDING:** whether full payment is required for `Enrolled`, whether partial payment can retain a seat, who can approve waivers, and whether external payment-provider reconciliation will be in scope.

### 4.4 Course exam and promotion lifecycle

```text
Normal promotion eligibility is preserved independently.

Course Enrolled/Running
      │ course exam published
      ├── Passed ──approved transition event──> Accelerated target class
      └── Failed/Incomplete/Withdrawn─────────> Normal promotion destination
```

**RECOMMENDED DEFAULT:** course failure never reverses an already-earned normal promotion. The course result creates an immutable transition proposal; the actual class switch occurs only at the promotion event approved in `RES-01`. One source event may produce only one effective transition.

## 5. Actor and consent contract

| Action | Recommended actor | Required proof/guard |
| --- | --- | --- |
| Publish automatic offers | Admin | Published source results; frozen eligibility rule; capacity does not need to be reserved yet. |
| Add candidate manually | Admin | Reason required; source class and target valid; same consent/payment/capacity flow follows. |
| Accept/decline for a child | Linked guardian account represented by current `student` role | Server proves `students.parentId === req.user.id`; decision stores guardian actor ID. |
| Accept/decline as learner | Learner account only if policy allows self-consent | Server proves `students.id === req.user.id`; age/grade rule must be approved. |
| Parent confirmation | Linked guardian account | Required even if learner accepted when policy says dual consent. |
| Record/waive/refund payment | Accountant; superadmin only when explicitly school-scoped and support policy allows | Finance transaction, receipt/reversal, reason/approval, school ownership. |
| Withdraw before/after start | Guardian/eligible learner requests; admin approves if policy requires | Effective date, reason, seat/refund impact preview. |
| Complete/cancel course | Admin; manager confirmation recommended for Running course | All enrollment/result/finance exceptions summarized. |

**PENDING STAKEHOLDER DECISIONS:**

1. Is learner self-acceptance allowed, and by age/grade?
2. Is guardian confirmation always required, or only for fee-bearing/accelerated courses?
3. Can one guardian confirmation cover multiple linked children? Recommended: **no**, one decision per child/offer.
4. Is electronic confirmation legally sufficient, and what policy text/version must be retained?
5. Can an admin override missing consent for safeguarding/operational reasons? Recommended: disabled by default; if allowed, require named authority and reason.

## 6. Cancellation, withdrawal, refund, and waitlist contract

### Recommended behavior

| Scenario | Academic action | Seat action | Finance action |
| --- | --- | --- | --- |
| Student declines before hold | Mark offer Declined | None | Void unpaid course invoice if one exists. |
| Hold expires unpaid/unconfirmed | Mark Released/Expired | Release and offer next waitlist entry | Void unpaid invoice; do not create a refund. |
| Student withdraws before start | Mark Withdrawn | Release and offer next waitlist entry | Accountant applies approved refund/credit policy through reversal, never edits payment. |
| Student withdraws after start | Mark Withdrawn with effective date | Stakeholder decision on refill; recommended no refill after course start | Refund percentage is policy-driven and finance-owned. |
| Admin cancels Open course | Cancel offers/enrollments | Release all seats and close waitlist | Void unpaid invoices; queue paid records for accountant refund/credit. |
| Admin terminates Running course | Preserve attendance/results to date; reason and manager confirmation | No silent transfer | Produce refund exception list; accountant posts approved reversals. |
| Student fails course | Preserve Failed outcome | No seat effect after completion | No automatic refund unless approved policy says otherwise. |

**RECOMMENDED DEFAULT:** refunds are never automatic ledger writes from the academic course service. Cancellation produces a finance work queue; an accountant reviews and posts each refund/credit using the original transaction and the current reversal controls.

### Decisions still pending

- Refund schedule before start, after start, and after non-attendance.
- Whether an administrative course cancellation requires cash refund, account credit, or payer choice.
- Whether a seat can be refilled after the first class/date.
- Waitlist expiry and number of offer attempts.
- Whether accepted but unpaid students may attend while `PaymentPending`.

## 7. Required invariants

1. A student has at most one active enrollment per course.
2. Counted seats never exceed capacity, including concurrent accept/manual-add requests.
3. Every offer/enrollment belongs to the same school as course, student, academic year, source class, target class, exam, and financial link.
4. Closed academic years reject course definition, offer, enrollment, result, and promotion mutations.
5. Eligibility and pricing are snapshotted when an offer is issued; later configuration changes do not rewrite history.
6. Manual candidates must store actor and nonempty reason; they do not bypass consent, seat, or finance rules.
7. `Paid` is derived only from posted finance records; UI claims and admin inputs cannot create it.
8. Refund total cannot exceed posted course collections and must point to the original transaction.
9. Course result does not overwrite the normal promotion result or the original main-exam result.
10. One course-result source event produces at most one effective accelerated promotion.
11. Target class must exist, be active, belong to the school, and satisfy the approved progression policy.
12. State changes are append-only/audited; deleting an offer, consent, payment link, result, or transition is not a correction mechanism.

## 8. State walkthrough acceptance scenarios

### A. Free course, guardian accepts, student passes

1. Published main exam produces an eligible candidate.
2. Admin issues offer; no seat is consumed.
3. Linked guardian accepts and confirms the current consent text.
4. Capacity transaction creates seat and enrollment with `NotRequired` payment.
5. Course runs; course exam is published as Passed.
6. Normal promotion remains recorded; an accelerated transition to target is applied once at the approved promotion event.

Expected evidence: eligibility snapshot, consent actor/policy version, seat transition, exam attempt, normal and accelerated transition history.

### B. Fee course, accepted, unpaid hold expires

1. Guardian accepts; a seat is held and invoice issued.
2. No posted payment arrives before hold expiry.
3. Hold becomes Released/Expired atomically; invoice is voided if unpaid.
4. First eligible waitlist entry receives a new offer/hold window.

Expected evidence: no over-capacity interval, no fake income/receipt, deterministic waitlist promotion, expired offer retained.

### C. Partial payment

1. Accountant posts a partial payment and receipt against the course invoice.
2. Course reads `PartiallyPaid`, not Paid.
3. Seat behavior follows the stakeholder-approved partial-payment policy.

Expected evidence: invoice balance and receipt remain finance-owned; course cannot mutate payment state. **This scenario remains blocked until partial-payment policy is approved.**

### D. Manual add at full capacity

1. Admin selects an otherwise eligible student and enters a reason.
2. Capacity lock reports no seat.
3. Candidate becomes Waitlisted or the request is rejected according to policy; existing enrollment is never displaced silently.

Expected evidence: reason/actor retained, capacity unchanged, no duplicate active enrollment.

### E. Student withdraws after payment before start

1. Withdrawal is approved and seat released.
2. Course creates a finance refund/credit task.
3. Accountant posts the approved reversal; original receipt/payment remains immutable.
4. Waitlist receives the released seat.

Expected evidence: course and finance audit trails correlate by enrollment/invoice; refund does not exceed collection.

### F. Course cancelled while Running

1. Admin supplies reason; manager confirms impact report.
2. Course moves to Cancelled without deleting schedules, attendance, or scores.
3. Enrollment outcomes are resolved; no accelerated promotions occur.
4. Paid accounts appear on finance exception queue and are handled through reversals/credits.

Expected evidence: full affected roster, transition history, refund queue reconciliation, no class mutation.

### G. Student fails course

1. Course result is Failed using frozen pass rules.
2. Original/main result and normal-promotion destination remain unchanged.
3. Student follows normal destination; no accelerated transition is created.

Expected evidence: both exam attempts remain visible, exactly one effective class transition.

### H. Concurrent final seat

1. Two valid acceptances race for one remaining seat.
2. Database serialization/locking grants exactly one seat.
3. The other acceptance becomes Waitlisted or receives a deterministic capacity response.

Expected evidence: capacity invariant, retry safety, stable actor-visible status.

## 9. Stakeholder decision register

| ID | Decision required | Recommended default | Required approver | Blocks |
| --- | --- | --- | --- | --- |
| C-01 | Who may consent: learner, guardian, or both? | Guardian confirmation required; learner may acknowledge but not replace guardian until age policy is approved. | Academic/safeguarding owner | Offer/consent API and UI |
| C-02 | Does acceptance reserve a seat, and for how long? | Reserve after required consent for 72 hours. | Operations owner | Capacity state machine |
| C-03 | Waitlist order and refill cutoff | FIFO by accepted timestamp; no refill after course starts. | Academic/operations owner | Waitlist behavior |
| C-04 | Payment prerequisite | Full posted payment or approved waiver before Enrolled; free courses bypass. | Finance + academic owner | Enrollment guard |
| C-05 | Partial payment policy | Keep `PartiallyPaid`; do not activate enrollment automatically. | Finance owner | Seat expiry and attendance |
| C-06 | Waiver/discount authority | Accountant records; named admin/manager approval required. | Finance governance owner | Finance workflow |
| C-07 | Refund/credit schedule | No percentage assumed; publish a signed schedule before accepting paid offers. | Finance/legal owner | Cancellation launch |
| C-08 | Course target and promotion timing | Apply once at academic-year transition; preserve normal promotion fallback. | Academic owner; align with `RES-01` | Promotion service |
| C-09 | Manual override of consent/capacity | Never override capacity; consent override disabled by default. | Safeguarding/academic owner | Admin manual-add flow |
| C-10 | Currency and external settlement | USD and recorded payments only for v1; external provider integration out of scope. | Finance/product owner | Pricing UI/API |

## 10. Manager acceptance evidence

RES-04 is ready for manager confirmation only when:

- all `C-01`–`C-10` decisions have named approvers and recorded answers;
- finance owner confirms invoice/payment/refund ownership and whether course charges reuse the existing invoice ledger;
- academic/safeguarding owner approves consent actors and retained consent evidence;
- operations owner approves seat hold, release, waitlist, and late-entry behavior;
- the eight walkthroughs are replayed with approved decisions and no contradictory transition remains;
- `BE-01`, `BE-05`, `DES-05`, `QA-03`, and `QA-04` link to the approved contract version.

**Current result:** research contract complete; product decisions remain pending and are intentionally not assumed.
