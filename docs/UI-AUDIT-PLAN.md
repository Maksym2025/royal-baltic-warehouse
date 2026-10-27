# Royal Baltic warehouse — UI audit and implementation plan

Branch: `feat/warehouse-ui-audit`. Baseline: `71914ad2ecba33af87b898fb685f121e21ccce2f`.

## Scope

Improve presentation and interaction in the existing private prototype. Keep `dist/inventory.js`, its action payloads, localStorage key/schema, and business tests unchanged. No database, migration, production integration, or changes to access controls. No merge into main or replacement of the deployed version as part of this branch.

The six requested skills are not available for application in this session; no claim is made that they were used. The implementation follows the user's explicit design brief.

## Audit findings

| Priority | Observed issue | Improvement |
| --- | --- | --- |
| High | Supporting labels use 8–11 px type, muted colors; warehouse operators must read tiny text | 13–14 px supporting text, strong neutral contrast, tabular numerals, 44 px main controls |
| High | An approved order's badge changes to release-authorized, combining two different states | Separate columns for order, payment and shipment authorization; persist labels through dispatch |
| High | Receipt records exist but are not presented as their own table | Add receipts tab with date, product, document and exact kg; show total received in stock detail |
| Medium | Order cards repeat instructions and consume vertical space | Comparable table rows on desktop; labeled stacked rows on mobile; compact actions per order |
| Medium | No inventory search or useful release queue filtering | Search by product/SKU; filters for active orders, waiting for root, ready for dispatch, all |
| Medium | Selected-product calculation is a long equation chain | Two explicit equations: opening + receipts − dispatched = on hand; on hand − reserved = available |
| Medium | A disabled permission action relies partly on its hover title | Visible explanation of root-only permission, with a separate test role switch |
| Medium | Journal mixes before/after values into prose | Exact before → after cells for on hand, reserved and available; clear role and timestamp |
| Medium | Full rerender can discard keyboard focus | Restore focus to triggering action, next action or relevant row after an operation |

## Sequence

1. Record audit, component structure, design tokens and chart decision before UI code edits.
2. Extract read-only rendering components from app controller; preserve all mutation code and state schema.
3. Apply restrained B2B layout, separate statuses, inventory search, receipt/history tabs and release filters.
4. Verify existing 15 business checks and full browser flow; add focused UI checks for new search/filter/history behavior and keyboard access.
5. Commit and push only the feature branch. Provide a self-contained review HTML and screenshots; keep published main untouched.

## Component structure

| Component | Responsibility | Source of data |
| --- | --- | --- |
| AppShell | Brand, section navigation, private/demo label, test role | Existing role + UI state |
| StockSummary | Physical, reserved and available stock, explicit definitions | Existing totals() |
| InventoryTable | Searchable SKU/product rows, exact weights, selected row | Existing products + stock() |
| StockBreakdown | Two equations, receipt/shipment totals, explanation | Existing stock(selectedId) |
| OrdersTable | Order stage, payment, release gate, next actions | Existing orders and permitted transitions |
| OperationHistory | Journal and receipt table with separate empty states | Existing events and receipts |
| ReceiptDialog | Product, positive quantity, reference, before/after preview | Existing RECEIVE action |
| ReleaseDialog | Order, payment and stock impact, explicit approval button | Existing AUTHORIZE and SHIP actions |
| StatusBadge / Weight / EmptyState | Consistent visual vocabulary and labels | Read-only presentation helpers |

## Design system

Neutral white/gray surfaces, deep Baltic teal for primary actions, amber for reserved/waiting, green for available/authorized, red only for destructive/error states. Text labels always accompany color. 8 px spacing grid, 8–12 px radii, no decorative illustrations or animated charts. Body 14 px; labels at least 12 px; numeric values use tabular figures. Visible keyboard focus, real buttons and native dialog, reduced-motion support.

## Bklit UI and UI-library decision

The existing app is dependency-free HTML/CSS/JavaScript. Keep native semantic HTML controls and CSS tokens for this focused branch. Bklit is a React/shadcn chart library; introducing a React build solely for three stock figures is unnecessary here.

| Need | Best presentation | Reason / future use |
| --- | --- | --- |
| Current stock per SKU | Table | Exact kg, SKU comparison and next action matter more than shape |
| Reserved vs available now | Numeric summary + two-term calculation | They are parts of physical stock; no misleading additive KPI or donut |
| Receipts / documents | Table | Date, document and amount must be inspectable |
| Order / payment / release | Table with independent labeled status columns | Operators must distinguish paid from authorized |
| Audit | Before/after table | Exact changes and responsible role |
| Stock trend over days | Bklit Line Chart later | Useful when date-indexed inventory snapshots exist; no invented history |
| Receipts vs dispatch per day/week | Bklit grouped Bar Chart later | Compare real kg flows with the same unit, time zone and date range |
| Product throughput comparison | Bklit horizontal Bar Chart later | Useful for a larger catalog; retain exact values and table alternative |

Do not add gauges, funnels, rings, real-time animations, financial candlesticks or forecast lines to this operational screen. Charts must use real recorded data, named series, axis units, hover values and an accessible table alternative. Grouped bars compare flows; do not combine free stock and physical stock as independent stacked quantities.

Sources: https://bklit.com/docs ; https://bklit.com/docs/components/line-chart ; https://bklit.com/docs/components/bar-chart
