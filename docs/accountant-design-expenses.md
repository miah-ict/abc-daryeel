# Accountant expenses and bills: screen and interaction spec

Use the accountant shell, Manrope/DM Sans typography, pale blue canvas, white panels, and restrained color tokens in `docs/accountant-design-shell.md`. The target navigation is **Expenses → Staff Payments, School Expenses** and **Documents → Invoices/Bills** as defined in `TODO.md`. Existing **Invoices** links can route to the new document list during migration. Distinguish a recorded expense from an unpaid bill: only a posted payment increases expense totals. Show USD consistently until school currency settings are implemented. Display the active date range beside every total.

## Staff Payments

**List.** A heading row contains **Record staff payment** and a selected period. Four compact metrics show staff paid, net paid, awaiting payment, and adjustments for that period. Below, provide search by staff name/ID, period, role, method, and status. Table columns: staff, role, pay period, gross, deductions, net, payment date, method, reference, and status. The row action **View payment** opens an auditable detail with component amounts and posting history. Accountants see only the identity and pay fields needed for payment; hide unrelated personnel and performance data. “No staff payments this period” offers **Record staff payment**; filtered empty results offer **Clear filters**.

**Record flow.** A right-side drawer (full screen on phone) starts with a searchable picker of existing staff/teacher records scoped to the school. Then choose a pay period and enter pay components (base pay and optional allowances/other earnings) plus deductions. Present read-only **Gross** and **Net to pay** calculations next to the fields and in a review panel. Require positive net amount, payment date, method, and a reference when the selected method needs one. Label any adjustment as a separate approved adjustment with its original payment link; never silently overwrite a posted payment. The review step repeats staff, period, component totals, net, method, date, and reference before **Record staff payment**. During posting, disable repeat submission; on success show the server-issued payment/ledger reference and **View payment**. Never imply that recording a bank or mobile payment initiates a transfer.

**Duplicate cue.** As soon as staff and period are selected, check for an existing payment and show its date, net amount, status, and **View existing payment**. Disable the normal post action for a paid period; direct an authorized correction to **Request adjustment**. If the server rejects a duplicate or period lock after the review screen, retain form values, refresh the existing payment summary, and place an inline error at the period field. The server remains authoritative when two users post concurrently.

## School Expenses

**List.** The first row shows posted expense total and count for the selected date range, with category and method filters. The table shows date, payee/vendor, category, description, amount, method, reference, linked bill, and posting status. Search can match payee, description, or reference. A **Record school expense** action is always visible. Use category color only as a subtle marker; amount and status remain text. A row opens a detail with attachment metadata (when supported), notes, source bill, actor, and ledger link. Never offer direct edits to a posted ledger amount; show **Reverse/correct** when permitted, with the original and reversal visible in history.

**Record flow.** Use a compact form with payee/vendor, category, expense date, positive amount, method, description, optional reference, notes, and optional attachment metadata if the service supports files. Categories include rent, electricity, water, internet, school supplies, and custom. If a vendor bill is selected, prefill vendor and unpaid balance, show the bill number and balance, and validate that the payment does not exceed the amount due. A custom category requires a nonblank name. Before posting, a review panel repeats amount, payee, category, method, date, bill application, and the resulting bill balance. Final action: **Record expense**; success shows one posted expense/ledger reference and a path to its detail.

**Duplicate cue.** When vendor, amount, date, and reference match a recent expense, display a nonblocking “Possible duplicate” panel with the matching record and **View expense**. For a repeated external reference or bill payment request that the server identifies as the same posting, prevent a second post and link to the original. For uncertain network outcomes, keep the form and resolve the original submission with its idempotency key before offering retry. Use a persistent inline error for failed posts, never a success toast before server confirmation.

## Invoices / Bills

**Register.** Place segmented **Student invoices** and **Vendor bills** views beneath one **Invoices / Bills** heading; keep their totals separate. Above each table show issued total, paid total, and outstanding total with date range and currency. Search by document number, student/vendor, or description; filter issue/due date, status, and class for student invoices or vendor for bills. Columns: number, recipient/payee, issued, due, total, paid, balance, status, and action. A due date does not turn a zero-balance document overdue. Default order puts overdue open items first, then nearest due date. Show **Create student invoice** and **Add vendor bill** as explicit actions; never use an ambiguous “Create invoice” for both directions.

**Create.** Student invoice form requires student, issued/due dates, one or more named line items with positive quantities and nonnegative unit prices, and a unique server-assigned number. Show student/class/academic period context and a live line-item subtotal and total. Vendor bill form requires vendor/payee, vendor bill number, issued/due dates, line items, and optional file metadata/notes. Show a duplicate warning for the same vendor and bill number; server rejection must preserve the draft. Review displays recipient, line items, dates, total, and the accounting effect: issuing a student invoice creates a receivable, while entering an unpaid vendor bill creates a payable/commitment. Neither action by itself records cash income or a paid expense. Only show “Issued” after the server confirms persistence.

**Detail interaction.** Clicking a document number or **View details** opens a full-page detail on desktop and a scrollable full-screen view on mobile, with a back link that preserves list filters. Header: type, number, text status, primary action, and a print/download menu. The printable body shows school identity, recipient/vendor, issue/due dates, line items, subtotal/total, paid, refunded/reversed if applicable, and current balance. Beside or below it, a timeline lists issuance, each partial payment, reversal/refund, adjustment, actor, timestamp, method, reference, and linked receipt/payment. Show a stable “as of” timestamp for the displayed balance. Student invoice actions: **Collect payment**, **View student account**, **Print/Download**. Vendor bill actions: **Record bill payment**, **View vendor**, **Print/Download**. Replace payment actions with **View history** when fully settled; explain when a closed period or voided document prevents posting. On successful partial payment, refresh the total, paid, balance, status, and timeline from one server response. A void/reversal keeps the original document and payment history visible.

## Shared behavior and copy

| English label | Somali helper |
| --- | --- |
| Staff payment | Lacagta shaqaalaha |
| Pay period | Muddada mushaharka |
| Gross pay | Mushaharka guud |
| Deductions | Lacagaha laga jaray |
| Net to pay | Lacagta saafiga ah |
| School expense | Kharashka dugsiga |
| Payee / vendor | Qofka ama shirkadda la siinayo |
| Category | Qaybta kharashka |
| Bill number | Lambarka biilka |
| Due date | Taariikhda kama dambaysta ah |
| Remaining balance | Haraaga harsan |
| Reference | Tixraac |

Keep English as the primary control name and use Somali as secondary helper text; do not place two languages in a cramped button. All forms use persistent labels, field-specific hints and errors, and clear required/optional markers. On invalid submit, focus the first invalid field and announce a concise error summary. Review screens keep **Back to edit** alongside the posting action. Posting/voiding actions require a clear confirmation when irreversible. Success and failure messages use a live region. Close an unposted drawer with Escape and restore focus to its trigger; during an in-flight post, prevent dismissal that could obscure the result.

At wide widths, keep filters above a full table and place the payment form beside a sticky document or staff summary. At 701–950 px, stack the summary above the form and allow tables to scroll within their card. At 700 px and below, use labeled row cards or contained horizontal table scrolling, collapse secondary filters into a labeled **Filters** disclosure, and make the primary action easy to reach without covering fields. Use at least 44 px touch targets, right-aligned tabular money, visible focus rings, text plus color for status, skeletons that preserve layout, and distinct messages for no records, no filter matches, load failure, and save failure. Printed documents must work in monochrome and include document number and balance without relying on color.

## Component handoff

The current `FinanceIncomeExpensesSection1.jsx` records all expenses through a generic transaction modal, and `FinanceInvoicesSection4.jsx` has only a student invoice table. Build dedicated expense and document views as isolated finance components, then connect them through the shared `AccountantWorkspace.jsx` owner. Reuse the existing panel, table, button, and status primitives, but obtain totals, balances, duplicate decisions, and post outcomes from the finance API. Keep the legacy invoice detail route functional for existing records during migration.
