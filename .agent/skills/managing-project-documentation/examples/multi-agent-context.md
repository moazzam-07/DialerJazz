# Admin Panel Multi-Agent Context

## Current Phase: Performance & Optimization

### Core Technical Patterns
- **Database:** Supabase with isolated `service_role` fetching for bypass in Server Actions.
- **Authentication:** Middleware drops highly cached `httpOnly` cookie (`hht_admin_verified`).
- **Data Fetching:** Always use `Promise.all()` to prevent waterfalls.
- **Crucial Files:** `src/app/(authenticated)/zakat/vendor/actions.ts` directly manipulates ledger transactions.

---

## Agent Work History & Work Logs

*(Note for Agents: Append new entries to the TOP of this list. DO NOT delete existing entries.)*

- **2026-04-03:** Refactored the entire Admin Vendor structure. Replaced client-side filtering with Server-Side `.range()` pagination on Donors page. Swapped `getSession` for `getUser`.
- **2026-03-20:** Designed the Surplus Ledger architecture for negative/positive stock accounting. 
- **2026-03-10:** Established the Midnight Emerald theme system across the main application wrapper.
