# Accountant workspace: shell and overview design spec

## Visual direction

Keep the existing ABC premium language shown in `public/references/accountant.png`: a pale blue canvas, translucent white surfaces, deep navy text, restrained blue and violet accents, rounded corners, and small friendly school imagery. Use the shared Manrope heading and DM Sans body typography. The interface should feel calm and trustworthy enough for financial work; color identifies a category or action rather than decorating every element.

## Application shell

| Area | Desktop specification |
| --- | --- |
| Canvas | `#F6F8FF` to pale blue, with a very subtle top radial wash. Keep content centered and comfortably padded; cards sit on the canvas rather than on a second full-width surface. |
| Sidebar | Fixed, approximately 238 px wide, inset 12 px from the viewport, rounded 24 px, white glass surface. Put the ABC logo at top, navigation in the middle, and the “Small Steps, Big Dreams” illustration at bottom. Allow internal scrolling on short screens. |
| Navigation | Group destinations as Overview; Income (Student Fees, Fee Collection, Outstanding Fees, Other Income); Expenses (Staff Payments, School Expenses); Documents (Receipts, Invoices/Bills); Reports and Controls (Daily Closing, Monthly Closing, Budget, Refunds, Ledger, Audit); Settings. Use a 20 px icon in a pale circular holder, a 12–13 px label, and a 44–48 px minimum row height. Active page uses a soft blue to lavender fill, a blue leading rule, stronger label weight, and `aria-current="page"`. Hover and keyboard focus have distinct visible states. |
| Main | Begin to the right of the sidebar, with about 16–20 px side padding and a maximum readable width on large displays. Use a 12–16 px content gap throughout. |
| Topbar | Sticky white glass bar, about 60–64 px tall, rounded 18–20 px. Search occupies the flexible left side. Right side holds notifications, theme switch, and the linked accountant profile. Preserve a clear boundary and stacking order for the notification popover. |
| Page heading | On inner pages, show breadcrumb, 24 px title, short description, and a visible period or school context. The overview uses its greeting hero in place of this heading. |
| Footer | Small muted ABC identity and copyright line after page content. It should wrap cleanly without crowding content. |

## Overview hierarchy

1. **Greeting row:** A wide, 160–180 px hero with greeting, one-line context, date chip, and softly masked calculator/desk photography. A compact quote card sits beside it on wide screens. Text must remain readable over the image.
2. **Four financial metrics:** Total Income, Total Expenses, Pending Payments, Net Balance. Keep all four visible in the first scan, with a clear label, 24–28 px amount, and a small context line. Use mint, rose, blue, and violet tones consistently. Pending Payments represents outstanding invoices; Net Balance represents income less expenses. Do not imply a trend when no comparison period was calculated.
3. **Analysis and action row:** Income vs Expenses is the widest panel, Expense Breakdown the next, Quick Actions the narrowest. Chart legends and time controls stay inside their panel. Quick actions are six equal targets: record income, record expense, generate report, create invoice, manage fees, view transactions.
4. **Operational row:** Recent Transactions, Outstanding Fees, and Monthly Summary. Table values align for scanning; monetary amounts are emphasized. “View All” routes to the corresponding destination. The month selector belongs to the summary header.

Use 16–20 px panel radii, a thin `#E5EBF7` boundary, and a low contrast shadow. Panel headings should be about 14–16 px and body/table text about 12–13 px; avoid the current 8–10 px text at normal desktop zoom. Keep status meaning in labels as well as color. Finance numbers should use tabular numerals and consistent currency formatting.

## Responsive behavior

| Width | Layout and navigation |
| --- | --- |
| Above 1150 px | Fixed sidebar; greeting and quote side by side; four metric columns; three analysis and three operational columns. |
| 951–1150 px | Fixed narrower sidebar; hide or stack the quote; analysis and operational panels move to two columns, with the last panel spanning the row. Metrics remain four columns only while labels and amounts fit without compression. |
| 701–950 px | Sidebar becomes an off-canvas drawer opened from the topbar. Use a dimmed scrim and close button. Main uses full width; metrics become two columns where needed. The topbar keeps search usable. |
| 700 px and below | Single-column panels and tables with horizontal scroll inside their own card. Two metric columns until a narrow phone requires one. Quick actions use two columns. The hero image becomes a subdued background and the quote moves below the hero or is omitted. Profile text may collapse to avatar, while menu, search, and notifications remain reachable. |

All interactive targets should be at least 44 px high on touch screens. The drawer should close on destination selection, scrim click, close button, and Escape, and return focus to the menu trigger. Popovers must fit the viewport. Honor reduced-motion preferences for transitions.

## States and consistency

- Show a visible focus ring on links, buttons, inputs, chart period controls, and drawer controls. The selected chart period needs a state beyond color alone.
- Search is page scoped; make its placeholder and enabled state match the active section. Notifications expose the count and link to invoices. The theme switch retains its accessible label in both states.
- Empty tables, unavailable chart data, and loading states should retain panel dimensions and explain what the accountant can do next.
- Use the shared design tokens and shell components already in `src/styles/admin.css`, then layer accountant-specific styling in `src/styles/accountant.css`. Keep light and dark variants equivalent in hierarchy and contrast.
