# Stock Movement Flow — End-to-End Trace

Verified against current source. This document traces every write path that
touches stock, movement history, sales, and the dashboard.

## Data model overview

| Collection | Doc shape (key fields) | Written by |
|------------|------------------------|------------|
| `products/<id>` | `{ storeId, currentStock, reorderPoint, costPrice, sellingPrice, needsReview, branchId, ownerId, updatedAt }` | create / update item, sale decrement, restock, refund |
| `movements/<id>` | `{ itemId, type, quantity, unitUsed, reference, referenceId, notes, storeId, branchId, ownerId, performedBy, performedByName, createdAt }` | manual movement form, sale, restock, refund |
| `sales/<id>` | `{ items[], itemIds[], storeId, branchId, ownerId, recordedBy, recordedByName, totalNgn, customerName, isCreditSale, status, createdAt }` | sale checkout |
| `debt_payments/<id>` | `{ storeId, branchId, recordedBy, amountNgn, customerPhone, createdAt }` | debt payment |
| `refunds/<id>` | `{ itemId, saleId, quantity, reason, storeId, branchId, recordedBy, createdAt }` | refund |

`MovementType` (from `src/types/inventory.ts`): `received | shipped | adjusted | transferred | lost | destroyed`.

## Flow A — Manual stock movement (MovementFormSheet)

1. `MovementFormSheet.tsx` `handleSave` (L132–163) builds a `StockMovement`
   (`type`, `quantity`, `itemId`, `reference`, `notes`, selected unit).
2. Calls `useCreateMovement().mutate` (`src/hooks/useInventoryMutations.ts`
   L142–167), which:
   - `addDoc`s a `movements` doc, overriding `storeId` (from business context),
     `branchId` (from claims), `ownerId`, `performedBy` (always the current
     uid), `createdAt`.
   - Fires a `notifyActivity` notification.
3. **Gap:** the movement doc is written, but the corresponding `products/<id>`
   `currentStock` is NOT incremented/decremented here. Stock only changes via
   sale / restock / refund paths. Manual adjustments that change stock rely on
   the caller updating the item (see Flow D note).

## Flow B — Payment / Sale (SalesStepCheckout → useSalesMutations.addSale)

`src/hooks/useSalesData.ts` `addSale` (L140–296):

1. Guards: requires `user` + `storeId`; non-admin staff can only sell for
   their assigned store (store-assignment guard L149–162).
2. Pre-flight per line item: reads each `products/<id>` (cache first, fallback
   to network), asserts the product exists and its `storeId` matches the sale's
   `storeId` (prevents permission-denied / cross-store writes).
3. In one `writeBatch` (atomic):
   - `sales/<newId>` — includes `storeId`, `branchId` (claims), `ownerId`,
     `recordedBy` = current uid, `recordedByName`, `createdAt`.
   - Per item: `products/<itemId>` `currentStock: increment(-decrementAmount)`
     where `decrementAmount = quantity * conversionFactor`.
   - Per item: `movements/<newId>` with `type: "shipped"`, `reference:
     "Sale: <saleId>"`, `notes: "Customer: <name>"`, plus store/branch/owner/
     performedBy fields.
4. After commit: `notifyActivity` ("New Sale Recorded") and per-item low-stock
   alert if `currentStock <= reorderPoint`.

Resulting history: **sale doc + product decrement + `shipped` movement**, all
atomic. The `movements` entries are what show in the item history timeline and
on the Movements page.

## Flow C — Price change (ItemDetailSheet / ItemFormSheet → useUpdateItem)

`src/hooks/useInventoryMutations.ts` `useUpdateItem` (L80–111):

1. `updateDoc(products/<id>, { ...updates, updatedAt })`.
2. `notifyActivity` ("Product Updated").

**Confirmed finding:** a price/cost change writes **no `movements` doc and no
`sales` doc**. It only mutates the product and emits a generic activity
notification that nothing surfaces. Price changes therefore do not appear in:
- Item history timeline (`useItemHistory` merges only `movements` + `sales`).
- The Movements page (`app.movements.tsx` reads `movements`).
- Dashboard revenue (reads `sales.totalNgn` only).

`MovementFormSheet` does allow entering an adjustment that changes price, but
the persistence only records the movement — stock/price deltas are not applied
automatically.

## Flow D — Restock / Purchase Order (instant receive)

`useCreatePurchaseOrder` (L169–244) with `isInstant: true` uses a batch:
- `purchase_orders/<id>` with `status: "RECEIVED"`.
- Per item: `products/<id>` `currentStock: increment(qty)` and optionally
  updates `costPrice` / `sellingPrice`.
- Per item: `movements/<id>` with `type: "received"`,
  `referenceId: <poId>`.

## Flow E — Refund

`useCreateRefund` (L507–594) batch:
- `refunds/<id>`.
- `products/<id>` `currentStock: increment(qty * conversionFactor)`.
- `movements/<id>` with `type: "received"`, `reference: "Refund: <id>"`.
- `sales/<id>` `hasRefund: true`.

## Flow F — History + Dashboard reads (read side)

- `useItemHistory(itemId)` (`src/hooks/useItemHistory.ts`): subscribes to
  `movements` (where storeId+itemId) and `sales` (where storeId +
  `itemIds array-contains`), merges into a sorted `HistoryEntry[]`. Sales show
  as "Sold" with negative quantity; movements show their `type`.
  `MovementTimeline.tsx` renders this.
- `app.dashboard.tsx` revenue: `totalRevenue = sales.reduce(totalNgn)` (L162),
  today revenue filters `createdAt` (L168). Product-level revenue comes from
  `item.unitPriceNgn * item.quantity` per sale line (L222). Dashboard never
  reads `movements` for money.
- `app.movements.tsx` reads the `movements` collection directly.

## Gap summary (things to patch if desired)

1. **Price changes are invisible to history** — no `movements` entry is
   written for cost/selling-price edits. If price history is required, add a
   `type: "adjusted"` movement (with old/new price in notes) inside
   `useUpdateItem` when `costPrice` / `sellingPrice` are in `updates`.
2. **Manual movement doesn't adjust stock** — `useCreateMovement` only logs the
   movement; stock is not incremented/decremented for
   `received`/`shipped`/`adjusted` logged manually. Verify whether the form
   expects the caller to also update the item.
3. **`useItemHistory` sales query depends on `itemIds`** — a sale without
   `itemIds` populated (older data) won't surface in item history.
4. **Dashboard revenue is sales-only** — refunds are not netted against
   `totalRevenue`; credit-sale collections (`debt_payments`) aren't reflected
   in revenue either.
