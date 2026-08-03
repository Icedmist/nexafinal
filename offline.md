# Full Offline Feature Plan

NEXA Store OS offline-first strategy. This document describes how full offline
support works today and the phased plan to make it reliable and complete.

## Current state (baseline)

Already working:

- **Firestore persistent cache** — `src/lib/firebase.ts` uses
  `persistentLocalCache` with `persistentSingleTabManager({ forceOwnership: true })`
  (IndexedDB). Offline reads are served from cache and writes are auto-queued by
  the SDK and flushed when connectivity returns.
  - Explicitly no `disableNetwork()` / `enableNetwork()` — those triggered the
    firebase-js-sdk ca9/b815 assertion crash (#9172) and were permanently removed.
- **Service worker** — `vite.config.ts` emits `sw.js` at build time. It precaches
  only the dashboard, sales and catalog route chunks plus their shared
  dependencies. Offline navigation is limited to `/app/sales`, `/app/dashboard`
  and `/app/catalog`; every other route gets a 503 "Not available offline" page.
  Registered in `src/main.tsx` (production builds only).
- **Connectivity indicator** — `src/components/layout/Header.tsx` shows a
  read-only Wifi/WifiOff badge driven by `navigator.onLine` plus `online`/`offline`
  events, with toasts on transitions. No manual toggle, no Firestore network
  control.
- **App-level resilience** — localStorage/sessionStorage fallbacks in
  `useTenant` (session > local > IndexedDB), `BusinessContext` (profile/ownerId/
  storeId cached and restored on mount) and `ThemeContext`.

## Known gaps

- No pending-sync indicator or write-queue visibility — users cannot tell how
  many writes are queued or whether they synced.
- Offline usable on only 3 routes; deep-links to other routes show a bare 503.
- Sales form finalize (form save + sale record + stock deduction) is not atomic
  offline, so a partial flush could leave inconsistent records.
- No dev/test offline mode — the SW only registers in production builds.

## Phase 1 — Visibility & trust

1. **Pending-sync indicator** — `Header.tsx`: combine `navigator.onLine` with
   Firestore `waitForPendingWrites(db)` to show an "x unsynced" badge, then
   "Syncing…" → "All synced" when reconnection completes.
2. **Data freshness cue** — tag cashier-critical views with
   `snapshot.metadata.fromCache` so users can tell they are seeing cached data.
3. **Graceful offline reads** — wrap `useSales`, `useInventoryData`,
   `useSalesForms` so a dropped connection shows an "Offline — showing cached
   data" strip instead of an error or empty state.

## Phase 2 — Reliable writes

4. **Atomic finalize** — bundle form save + `sales` record + stock deduction into
   one `writeBatch` in `handleSave(true)` (`src/components/sales/SalesFormBuilder.tsx`),
   so an offline finalize queues atomically and flushes as one unit.
5. **Explicit fallback queue** — if batch behavior proves insufficient, add a
   localStorage-backed queue mirroring `useSalesMutations`, flushed on the
   `online` event.

## Phase 3 — Expand offline surface

6. **Precache more routes** — add `/app/forms` and `/app/store-credits` to
   `ENABLED_ROUTE_FILES` / `ENABLED_PAGES` in `vite.config.ts`.
7. **Tiered offline** —
   - Full offline (reads + queued writes): sales, dashboard, catalog, forms.
   - Read-only offline: store-credits, analytics.
   - Blocked offline: admin/system-admin routes.

## Phase 4 — UX & resilience

8. **Reconnect summary** — on `online`, toast how many queued writes were flushed;
   offer a retry button for failed writes.
9. **Cache hygiene** — version the cache (already done via `__NEXA_CACHE_VERSION__`),
   keep `skipWaiting` + `clients.claim()`, and clear cached data on logout or store
   switch so one store's data never leaks into another.

## Phase 5 — Test & verify

10. **Dev offline toggle** — SW only registers in production today; add a dev-only
    way to simulate offline (seed a demo offline toggle) so flows can be QA'd
    without `npm run build`.
11. **QA checklist** — kill the network mid-finalize, mid-edit, and mid-topup and
    verify: data is queued, the UI says so, and everything flushes on reconnect
    without partial records.

## Recommended order

1. Phase 1 items 1–2 (quick, builds trust).
2. Phase 2 item 4 (atomic finalize).
3. Phase 3 item 6 (widen routes).
4. Remaining items in phase order.

## Deploying

Push to `feature/system-admin-workflow` — that branch is the production branch
and triggers the Vercel rebuild (see `README.md`).
