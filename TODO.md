# Accountant dashboard overhaul — implementation checklist

## Implemented in this pass

- School scoped finance schema and migrations (`0008`, `0009`), including legacy owner backfill, quarantine of unowned or mismatched links, and database ownership constraints.
- School scoped income, invoice, receipt, expense, staff pay, bill, refund, budget, closing, ledger, audit, report, and settings API routes.
- Atomic invoice/bill payments, receipt creation for collections, idempotent payment retry, reversal refunds, duplicate payroll guard, and closed period posting guard.
- New responsive accountant workspace with grouped navigation, Somali helper text, server backed forms and data, printable receipt, searchable tables, report CSV, and posting review step.
- API and route rendering checks covering the new modules. Local `db:migrate`, `npm run check`, `npm test`, and `npm run build` passed.

**Still to resolve before a production rollout:** line item editing on invoices and bills, automated reconciliation of ambiguous legacy finance rows, browser visual review with a configured school account, and live Neon migration validation. Payment recording tracks externally received money; it does not initiate a bank/mobile transfer.

## Goal and current baseline

Build a modern, easy to use accountant workspace backed by school scoped PostgreSQL records. The requested modules are Income (Student Fees, Fee Collection, Outstanding Fees, Other Income), Expenses (Staff Payments and School Expenses), Receipts, Financial Reports, Daily Closing, Monthly Closing, Budget, Refunds, Invoices/Bills, Ledger, Audit, and Settings.

Existing UI: `src/features/finance/components/AccountantWorkspace.tsx`, its section components, `src/data/accountantData.ts`, and `src/styles/accountant.css`. The screen currently says “Demo ledger” and performs most actions through `useLocalState` / `/api/workspace/accountant`. Existing relational finance tables are only `invoices` and `transactions`. `POST /api/finance/payments` already updates an invoice and transaction atomically. Preserve that invariant.

**Release blocker:** finance queries in `server/routes/finance.routes.js` and `readWorkspace` in `server/services/workspace.js` do not filter records by school, and finance tables have no `school_id`. Tenant isolation must be implemented and verified before exposing real records to school accountants.

## Sequence and acceptance criteria

### P0 — foundation and migration

- [ ] Define one school scoped finance data contract and migration. Add `school_id` to all finance records, including existing invoices and transactions; backfill existing rows from students/invoices where possible. Set ownership constraints and indexes for school, dates, student, invoice and status. Resolve legacy rows that cannot be attributed to a school without exposing them across schools.
- [ ] All finance reads and writes derive school scope from authenticated user, never a client supplied school ID. Superadmin cross school access must be explicit and tested. A school accountant cannot view or mutate another school's records by guessed ID, including receipts, exports, reports and workspace reads.
- [ ] Use integer minor units or validated `numeric(12,2)` arithmetic consistently. Reject invalid dates, negative amounts, excess payments and duplicate submissions; use database transactions and row locks for balance changes.
- [ ] Keep migration SQL, Drizzle schema, fixtures and tests aligned. Migrations work against a fresh database and an existing development database with current records.

### P1 — income and student fees

- [ ] **Student Fees:** CRUD fee plans or student charges with academic period, due date, line items and optional class/student assignment. Changes to a plan do not rewrite issued invoices. Show each student's charges, paid amount, balance and history.
- [ ] **Fee Collection:** record partial/full payment against a valid charge or invoice in one database transaction. Generate a unique receipt number and immutable income ledger entry in that transaction. Return receipt data immediately for print/download. A retry with the same idempotency key cannot collect twice.
- [ ] **Outstanding Fees:** filter by student, class, due date, status and aging bucket. Show correct current balance from posted charges/payments/refunds and distinguish pending, partial, overdue and paid.
- [ ] **Other Income:** capture source, category, date, method, amount, reference and notes; post to ledger and create a receipt. Do not count an unpaid invoice as income.

### P2 — expenses, bills and payroll

- [ ] **Staff Payments:** select an existing staff/teacher record, period and pay components; record gross, deductions and net, payment method, date and reference. Prevent duplicate payment for the same staff and period unless a separate approved adjustment is recorded. Do not expose unrelated personnel details to accountants.
- [ ] **School Expenses:** record vendor/payee, category (rent, electricity, water, internet, school supplies and custom), date, amount, method, reference, attachment metadata if supported and notes. Post the expense to ledger once.
- [ ] **Invoices/Bills:** create and view student invoices and vendor bills with unique numbers, line items, issued/due dates, lifecycle status, partial payments and printable detail. Payment and reversal history remains visible. Existing invoices continue to work after migration.

### P3 — controls and reconciliation

- [ ] **Receipts:** searchable receipt register linked to each posted collection or other income entry; print/download a clean, branded receipt with school, payer, amount, method, date, number and transaction reference. A receipt cannot exist for an unposted payment.
- [ ] **Refunds:** issue a refund against an eligible original collection with reason, approver/actor, date, method and reference. Reject cumulative refunds above collected amount. Preserve the original receipt and post an auditable reversing ledger entry; update balance where relevant.
- [ ] **Ledger:** chronological, append only view with account/category, debit/credit or signed amount, source document, actor and timestamps. Corrections use reversals rather than editing or deleting posted entries. Exports match filtered rows and totals.
- [ ] **Daily Closing:** preview expected income/expense by method for a selected day, record counted cash and variance, and save a timestamped close with actor. A duplicate close is rejected or explicitly reopened with an audit event.
- [ ] **Monthly Closing:** summarize and lock a selected month after daily reconciliation, including opening/closing balances, income, expense, refund and outstanding totals. Define and test the policy for late postings/reopening.
- [ ] **Budget:** create category and period allocations; show actual posted expenses, committed bills if implemented, remaining budget and overrun. Changes to approved budgets are versioned or audited.
- [ ] **Audit:** expose finance activity history with actor, timestamp, record, action and before/after or reversal reference. Include failed permission attempts where the existing audit architecture supports them. Accountants may view finance events only for their school.
- [ ] **Financial Reports:** date range and period filters for income, expenses, cash flow, receivables aging, collection rates, staff pay and budget vs actual. Screen totals, CSV downloads and print output derive from the same server query; empty and large results remain usable.

### P4 — front end and usability

- [ ] Replace the demo ledger and local mutation path with finance API calls and loading, error, empty and success states. Keep theme preference local if desired; financial settings and records save on the server. Remove demo copy only when all visible actions persist.
- [ ] Use a clear information architecture: Overview, Income (Student Fees, Collections, Outstanding, Other Income), Expenses (Staff Payments, School Expenses), Documents (Receipts, Invoices/Bills), Reports, Daily Close, Monthly Close, Budget, Refunds, Ledger, Audit, Settings. Sidebar and page headings use consistent names and active states.
- [ ] Build a responsive overview with received today, spent today, pending fees, available/net position, quick actions, due items and recent activity. Every total has a clear date range and currency. Charts show real server data.
- [ ] Provide compact but complete forms with inline validation, keyboard focus, accessible labels, confirmation for irreversible posting/closing/refunds, and safe feedback after API failures. Tables support search/filter, pagination or bounded loading, and usable mobile layout.
- [ ] Financial settings include school receipt details, currency/display settings, categories, payment methods and closing preferences where supported. Saving settings must not change authentication credentials or unrelated school records.

### P5 — audit, tests and rollout

- [ ] API tests cover authorization and school isolation for every new endpoint; duplicate payments, concurrent payments, partial payments, overpayments, refunds, closed period rules, receipt numbering, and rollback when any write fails.
- [ ] Frontend tests cover critical flows using server responses: issue invoice, collect fee, print receipt, post expense, refund, close day/month and handle validation/network errors. Review keyboard and responsive behavior in a browser.
- [ ] Run `npm run check`, `npm test`, `npm run build`; fix all failures. Review generated SQL and run migration against a disposable copy before any live deployment. Confirm data reconciliation and compare pre/post finance totals.
- [ ] Update `README.md` with schema, API, permissions, migration, reporting semantics and any remaining limits. Prepare a short release note and manual operator workflow.

## Work packages and file ownership

The requested staffing plan has one manager and five roles in each work group. These are work packages; the root coordinator assigns agent instances according to available concurrency and integrates sequentially where needed.

| Group | Package | Primary files / output |
| --- | --- | --- |
| Manager | Integration, sequencing, decisions, acceptance | `TODO.md`, merge coordination, final verification |
| Planning 1 | Existing flows and gap inventory | `docs/accountant-requirements.md` |
| Planning 2 | Data model and migration plan | `docs/accountant-data-contract.md` |
| Planning 3 | API contracts and permissions | `docs/accountant-api-contract.md` |
| Planning 4 | Reports and accounting definitions | `docs/accountant-report-definitions.md` |
| Planning 5 | Test plan and migration checklist | `docs/accountant-verification.md` |
| Design 1 | Navigation and overview layout | Finance design notes / `src/styles/accountant.css` recommendations |
| Design 2 | Income and collection flows | Finance design notes / component recommendations |
| Design 3 | Expense and bill flows | Finance design notes / component recommendations |
| Design 4 | Reports, close, budget, audit | Finance design notes / component recommendations |
| Design 5 | Mobile, accessibility and visual QA | Finance design notes / QA findings |
| Front end 1 | Workspace shell, navigation, dashboard | `AccountantWorkspace.jsx`, `accountantData.js` |
| Front end 2 | Student fees, collections, outstanding, other income | New `src/features/finance/components/` income modules |
| Front end 3 | Staff payments, school expenses, invoices/bills | New finance expense/document modules |
| Front end 4 | Receipts, refunds, ledger and audit | New finance control modules |
| Front end 5 | Reports, daily/monthly close, budget, settings, responsive styling | New finance reporting modules, `accountant.css` |
| Back end/DB 1 | School scope and migration foundation | `server/db/schema/finance.js`, `server/db/migrations/`, existing finance read paths |
| Back end/DB 2 | Fees, invoices, payment and receipts | Finance schema/service/routes, `financeApi.js` contract |
| Back end/DB 3 | Staff pay, expenses and bills | Finance schema/service/routes |
| Back end/DB 4 | Refunds, ledger and audit | Finance schema/service/routes |
| Back end/DB 5 | Closing, budget, reports and settings | Finance schema/service/routes |
| Audit/fix 1 | Security and school isolation | `server/tests/api.test.js`, route review |
| Audit/fix 2 | Data integrity and migration | Migration review, financial reconciliation tests |
| Audit/fix 3 | UI flow, a11y and mobile | `server/tests/frontend*`, browser QA |
| Audit/fix 4 | Reporting and money/date correctness | API/UI report tests |
| Audit/fix 5 | Integration, regression and docs | `npm run check`, `npm test`, `npm run build`, `README.md` |

**Integration rule:** only one agent should edit the shared `AccountantWorkspace.jsx`, `accountant.css`, `server/db/schema/finance.js`, migration journal and route mount files at a time. Other packages should use new isolated modules and submit agreed contracts to the manager before wiring them in. Avoid separate client implementations of accounting totals.
