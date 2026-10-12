# Accountant reports and controls: screen and interaction spec

Use the accountant shell and visual tokens in `docs/accountant-design-shell.md`. Place **Financial Reports**, **Daily Closing**, **Monthly Closing**, **Budget**, **Refunds**, **Ledger**, and **Audit** under Reports and Controls. Keep USD and the school time zone visible with every period or cutoff. All totals, lock decisions, export rows, and posting outcomes come from the school scoped server response. Show an **as of** timestamp for balances and snapshots. Never calculate official closing or report figures from the current browser's transaction list.

## Financial Reports

The page opens with a report picker and one shared filter bar: start and end date, period preset, and report specific filters. Offer **Income**, **Expenses**, **Cash Flow**, **Receivables Aging**, **Collection Rate**, **Staff Pay**, and **Budget vs Actual**. A report summary states its scope, currency, generated time, total, and record count; the table or chart follows. Put **Download CSV** and **Print** beside the active report title, with a short note that both use the same applied query as the screen. Preserve filters in the URL so a detail link returns to the same result. Label definitions next to ambiguous measures: collection rate's numerator and denominator, aging bucket cutoffs, and whether cash flow includes refunds. Date filters use the school time zone and clearly state inclusive boundaries. Show “No records in this period” separately from “No matches for these filters”; offer **Clear filters** for the latter. For large reports, show server pagination and a complete export count; never suggest that the current page is the full export. Charts provide an equivalent data table.

## Daily Closing

Show a date picker, close status (**Open**, **Closed**, or **Reopened**), prior close reference if any, and a **Preview close** action. The preview lists posted income, posted expense, and refunds by payment method, with expected cash, counted cash input, and an explicit signed variance. Put method totals and their source transaction links above a review panel. Explain the variance formula in text and mark a nonzero variance for review without hiding it. Require a reason or note for nonzero variance, and require an authorized actor to confirm **Close day**. The confirmation repeats date, expected cash, counted cash, variance, and posting cutoff. Save only after a fresh server check; during save disable duplicate submission. Success shows close ID, actor, timestamp, variance, and **View close**. If another user closed the day or postings changed, retain the count, refresh the preview, and require a new review. A closed day is read only; a permitted **Reopen day** flow asks for a reason, confirms the affected close, and displays the audit event and new status. Never overwrite the previous close snapshot.

## Monthly Closing

Show month, status, unresolved daily closes, and a reconciliation checklist. The preview includes opening balance, posted income, posted expenses, refunds, closing balance, receivables/outstanding balance, and any variance or late posting exceptions. Every figure has its calculation label and link to its source report. Disable **Close month** until the server declares prerequisites satisfied; say which days or exceptions need attention. A review screen repeats the month, totals, unresolved items, and lock effect, then confirms with **Close month**. Success shows immutable close reference, actor, timestamp, and links to the monthly report and audit history. For a locked month, show a clear explanation on posting forms and link to the authorized **Reopen month** process. Reopening requires a reason, an explicit confirmation, and a visible audit event; keep all earlier snapshots and versions. If policy permits a late correction without reopening, show its effective date, posting date, and effect in the next open period rather than silently changing a closed snapshot.

## Budget

At the top show selected period and four totals: approved budget, actual posted expenses, committed unpaid bills (if supported), and remaining. A category table shows allocation, actual, commitment, remaining, percent used, and text status (**On track**, **Near limit**, **Over budget**). Make the inclusion of commitments explicit in the remaining formula. **Create budget** asks for period and category allocations; show running total and require review before saving. Draft budgets can be edited. Approved budgets have **Request revision** or **Revise budget** according to permission, with a reason, old/new amount, effective date, and version history. A revised amount never erases its prior approval. Row detail links to filtered expense and bill records behind the actual and committed figures. Empty state: “No budget for this period” with **Create budget**.

## Refunds

The register shows date, refund ID, original receipt/payment, student or payer, amount, method, reason, actor/approver, status, and ledger reference. Search by receipt, student/payer, or refund ID; filter date, method, and status. **Issue refund** begins with a lookup of an eligible posted collection within this school, then displays original collected amount, prior refunds, maximum refundable amount, and current invoice/student balance. Require a positive amount within the server confirmed remaining refundable amount, reason, date, method, reference when relevant, and required approval. The review screen states the accounting and balance effect and repeats the original receipt link. Final confirmation says **Issue refund**. Disable repeat submission while pending. On success show refund ID, reversing ledger entry, actor, timestamp, and updated balance; retain the original receipt and its history. A stale balance, closed period, insufficient permission, or duplicate request returns a persistent inline explanation and a link to the relevant record. Resolve uncertain network outcomes by submission key before retrying.

## Ledger

Provide a chronological append only register with period/date range, account or category, source type, and search by reference or document ID. Columns: effective date, posted timestamp, entry ID, account/category, debit, credit (or a clearly labeled signed amount), source document, actor, and reversal link. Show opening balance, total debits, total credits, and closing balance for the applied filter; say when a narrowed category filter makes a total partial. Clicking an entry opens a detail with immutable posting facts and source history. Corrections appear as separate reversing and replacement entries linked to the original; do not present edit or delete controls for posted entries. CSV export matches the applied server query, including all pages and stated totals.

## Audit

Show a filterable finance activity timeline or table with timestamp in school time zone, actor, action, record type/ID, outcome, and linked record. Detail shows before/after values where permitted, plus reason, approval, request/reference ID, reversal or reopen relationship, and event time. Label system actions clearly. Filter by date, actor, action, record, and success/failure when available. Permission failures appear only if the existing audit service records them. The accountant sees finance events for their own school; sensitive fields are masked according to role. An audit event is read only and has a stable ID suitable for support investigation. Export uses the same applied scope as the screen.

## Shared states, language, and accessibility

| English control or term | Somali helper text |
| --- | --- |
| Financial reports | Warbixinnada maaliyadda |
| Daily closing | Xiritaanka maalinlaha ah |
| Monthly closing | Xiritaanka billaha ah |
| Expected cash | Lacagta caddaanka ah ee la filayo |
| Counted cash | Lacagta caddaanka ah ee la tiriyey |
| Variance | Farqiga |
| Budget | Miisaaniyad |
| Actual expense | Kharashka dhabta ah |
| Remaining budget | Miisaaniyadda harsan |
| Refund | Lacag celin |
| Reason | Sabab |
| Ledger | Buugga xisaabaadka |
| Audit history | Taariikhda hubinta |
| Reopen | Dib u fur |

Keep English as the primary control label and Somali as concise secondary help; long bilingual text belongs in field hints, not buttons. Every form field has a persistent label, required/optional marker, connected hint/error, and appropriate input type. Invalid review moves focus to the first error and announces an error summary. Confirmation dialogs describe the specific period or transaction, trap focus, and restore it to the triggering action on dismissal. Success and failure messages use a live region. A pending post cannot be dismissed in a way that hides its outcome. Status uses text and color; focus rings remain visible in light and dark themes. Monetary columns use right aligned tabular numerals and consistent currency precision. Printed reports and close summaries remain understandable in monochrome.

Above 1150 px, place filters and summary cards across the page, then table or chart at full width; a detail side panel may sit beside the register. At 701–1150 px, wrap filters and stack detail beneath the main table. At 700 px and below, put secondary filters in a labeled disclosure, turn dense ledger/audit rows into labeled cards or contain scrolling within the panel, and use full screen review/details. Keep primary actions reachable without obscuring fields, allow long IDs to wrap or copy, and keep touch targets at least 44 px. Loading skeletons retain the final layout; load failure offers **Retry** without losing filters, while save failure retains entered values. Reduced motion preferences apply to drawers, status transitions, and charts.

## Component handoff

`FinanceReportsSection6.jsx` currently has three CSV cards and two charts fed by browser transactions. Build each control as a dedicated finance view and connect it through `AccountantWorkspace.jsx` and the shared shell. Reuse panel, table, button, and status styling in `src/styles/accountant.css`, but use API supplied records and report definitions for official values. Preserve existing report links during migration; new navigation labels should follow `TODO.md`.
