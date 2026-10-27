# Royal Baltic Warehouse Lab

This is a local export of the existing private warehouse prototype. Preserve the existing design and working behavior unless the user asks for changes.

- Work only in this standalone project. Do not connect production Neon/Supabase, change the CRM or royal-baltic.eu / royal-baltic.com, or deploy.
- All data is demonstration data. There is no server authentication; role switching is explicitly a simulation.
- Physical stock = opening + receipts - actual shipments.
- A draft order neither reserves nor deducts. Only confirmation creates a reserve.
- Payment is independent of release authorization. Only root can authorize; authorization alone deducts nothing. Manager shipment requires that authorization. Delivery must not deduct again.
- Preserve the journal, integer grams, original storage key and version 1 schema. Never silently reset existing browser data.
- Domain source `src/domain/inventory.js` and original CSS have been copied byte-for-byte. `reference/` is the comparison baseline, not the development target.
- Use React/TypeScript components in `src`. No iframe or injected legacy app as a replacement for React functionality.
- Before UI work read `docs/DESIGN-SETUP.md` and `docs/UI-AUDIT-PLAN.md`. When real UI UX Pro Max / Emil Design Skills are installed in the active agent, read and apply those instructions; never claim unavailable skills were applied.
- Add shadcn/Bklit components only when used. Preserve existing CSS defaults and colors.
- Use a separate local branch for future changes. Run `npm run check`; critical browser scenarios are listed in `docs/VERIFICATION.md`.
- Keep checks local. Do not add GitHub Actions, production credentials or deployment automation.
