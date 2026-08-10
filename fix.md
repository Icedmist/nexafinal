# Sales Forms History Fix

## Problem

Forms history disappeared from the app even though the underlying sales records still existed in Firestore.

### Root cause

Some historical `sales_forms` documents were missing `storeId` and/or `saleId`. The app's Forms query and sales-resolution logic relied on `BusinessContext.storeId` and branch-scoped filters, which excluded legacy documents that had incomplete fields.

### Impact

- `Forms` page showed zero items for finalized form sales
- related sales still existed in the `sales` collection
- sales generated from forms were not being linked back to the Forms UI

## Fix

### Code changes

1. `src/hooks/useSalesData.ts`
   - Added fallback `targetStoreId = storeId || claims?.storeId || null`
   - Adjusted queries so legacy sales without `storeId` are still accepted during auth/context initialization
   - Allowed legacy branch values like `null` or `"none"` for branch-scoped users

2. `src/hooks/useSalesForms.ts`
   - Used `targetStoreId` when querying forms
   - `saveForm()` now writes `storeId: targetStoreId` when creating a new form
   - This prevents new forms from missing `storeId`

3. `src/routes/app.forms.tsx`
   - Improved `resolveSaleForForm()` to match forms to sales using:
     - `form.saleId` if available
     - `sale.formNumber` on `sales` with `source === "form"`
     - fallback heuristics based on items, total, phone, and time
   - Added debug output to inspect `claims`, `storeId`, `formsCount`, `salesCount`, and sample docs

4. `src/components/sales/SalesFormBuilder.tsx`
   - Confirmed finalizing a form builds a sale and writes `saleId` back to the form

### Migration script

5. `scripts/fix_sales_forms_from_sales.js`
   - Admin repair script to create or patch `sales_forms` from `sales` where `source === "form"`
   - Adds missing `saleId`, `storeId`, and `branchId`
   - Supports `--dry-run`, batching, and `--limit`

## How to run

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm install firebase-admin minimist --no-audit --no-fund
node scripts/fix_sales_forms_from_sales.js --dry-run --limit=100
```

After reviewing the dry-run output, apply the repair:

```bash
node scripts/fix_sales_forms_from_sales.js --limit=500
```

## Notes

- The script is the safe, auditable way to repair historical data.
- New form creation is now resilient and will always write `storeId` when available.
- This fix ensures existing finalized form sales become visible again in the Forms UI.

## App-side feature fix

The app now tolerates delayed store initialization and uses the user's claim-based `storeId` when `BusinessContext.storeId` is not yet available.

Changes:
- `src/hooks/useSalesForms.ts` now keeps the form listener updated when `claims.storeId` becomes available.
- `saveForm`, `updateForm`, `deleteForm`, and `listFormNumbers` now use the resolved `targetStoreId` instead of requiring `BusinessContext.storeId`.
- `src/hooks/useSalesData.ts` now reacts to `claims.storeId` changes so sales queries stay current during auth/profile initialization.
