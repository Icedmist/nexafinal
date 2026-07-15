# Wholesale/Retail Pricing Implementation

## What's Been Created

### 1. **Price Utilities** (`src/components/sales/price-utils.ts`)
- `SalePriceMode` type: "retail" or "wholesale"
- `buildCartKey()` - Creates cart keys with format `${itemId}:${unitName}:${saleType}`
- `parseCartKey()` - Extracts itemId, unitName, and saleType from cart keys
- `getItemPriceForMode()` - Returns the correct price based on sale type

### 2. **UI Components**
- **PriceModeSelector** (`PriceModeSelector.tsx`) - Dropdown to choose between Retail/Wholesale
- **SaleTypeBadge** (`SaleTypeBadge.tsx`) - Visual badge showing which pricing mode was used in history

### 3. **Data Model Updates** (`src/types/inventory.ts`)
- `Item` now has `wholesalePrice?: number` field
- `SaleLineItem` now has `salePriceMode?: "retail" | "wholesale"` field
- `SaleTransaction` now has `saleType?: "retail" | "wholesale" | "mixed"` field

### 4. **Catalog Form Updates** (`src/components/catalog/ItemFormSheet.tsx`)
- Added "Wholesale Selling Price" field alongside "Retail Selling Price"
- Both validation and form schema updated

### 5. **Sales Grid Architecture** (`src/components/sales/SalesGrid.tsx`)
- Added `defaultSaleType` state tracking retail vs wholesale
- Passes `defaultSaleType` to SalesStepBrowse and SalesStepCheckout
- Cart keys now include the sale type

## What Still Needs to be Wired

### CRITICAL - Checkout Flow
- [ ] Update `SalesStepCheckout.tsx` to:
  - Accept `defaultSaleType` prop
  - Show `PriceModeSelector` in customer details section
  - Capture `salePriceMode` on each line item when building saleData
  - Pass `saleType` to addSale mutation

### Sales History & Receipts
- [ ] Update `SalesReceipt.tsx` to display `SaleTypeBadge` 
- [ ] Update `SalesHistory.tsx` to show sale type column
- [ ] Update PDF export (`pdf-export.ts`) to include sale type in reports
- [ ] Enable filtering by sale type (Retail / Wholesale) in history

### Download Functionality
- [ ] Add PDF export option for "Retail Only" sales
- [ ] Add PDF export option for "Wholesale Only" sales
- [ ] Add PDF export option for "All Sales" (already exists, update to show types)
- [ ] Update CSV export to include sale type column

### Data Persistence
- [ ] Verify Firestore saves `salePriceMode` on each line item
- [ ] Verify Firestore saves `saleType` on sale transaction
- [ ] Test migration for existing sales (backward compat)

## Next Steps

1. Wire SalesStepCheckout to capture and display sale type selector
2. Ensure line items capture salePriceMode from checkout state
3. Update SalesHistory to show sale type badge for each transaction
4. Update PDF/CSV export functions to include sale type
5. Test end-to-end flow: browse → add item → select wholesale → checkout → history

## Notes

- Cart keys are now 3-part: `itemId:unit:saleType`
- When saleType is not specified, defaults to "retail"
- Each line item can have different prices based on mode (wholesale vs retail)
- Wholesale price can be higher or lower than retail - no constraint
- Price mode is captured at checkout, not per-item in cart
