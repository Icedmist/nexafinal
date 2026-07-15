# Wholesale/Retail Pricing - Manual Test Guide

## Prerequisites
- Application running with new code deployed
- User logged in with POS access
- Products in inventory with both retail and wholesale prices

## Test Flow 1: Basic Wholesale Sale

### Step 1: Setup a Product (If needed)
1. Navigate to Catalog
2. Create or edit a product with:
   - Name: "Test Widget"
   - Retail Price: ₦1000
   - Wholesale Price: ₦700
3. Save product

### Step 2: Start POS
1. Click "Sales" or open POS interface
2. **Verify**: Price Mode Selector appears in top-left of Browse step
   - Default shows "Retail"

### Step 3: Select Wholesale Mode
1. Click the "Price Mode" dropdown
2. Select "Wholesale"
3. **Verify**: Dropdown now shows "Wholesale"

### Step 4: Add Item to Cart
1. Search for or click "Test Widget"
2. **Verify**: Price shown is ₦700 (wholesale price)
3. Select quantity: 10
4. Click Add to Cart

### Step 5: Review Cart
1. Cart displays 10 units of Test Widget
2. **Verify**: Unit price shown is ₦700 (not ₦1000)
3. Total shown is ₦7000

### Step 6: Checkout
1. Click "Proceed to Checkout"
2. **Verify**: Price Mode Selector shows "Wholesale" at top
3. Can optionally change mode here (if needed)
4. Enter customer details (optional)
5. Select payment method
6. Click "Record Sale"

### Step 7: Verify Sale Saved
1. Receipt displays showing wholesale items
2. Navigate to Sales History
3. **Verify**: Recent sale shows [WHOLESALE] badge or label

---

## Test Flow 2: Mixed Sale (Wholesale + Retail)

### Step 1: Start Fresh Sale
1. Go back to Browse step
2. **Note**: Price Mode still shows "Wholesale" from previous sale

### Step 2: Add Wholesale Item
1. Add 5 units of Test Widget at Wholesale (₦700)
2. Subtotal: ₦3500

### Step 3: Change to Retail Mode
1. Click Price Mode dropdown
2. Select "Retail"
3. **Verify**: Dropdown now shows "Retail"

### Step 4: Add Retail Item
1. Add 2 units of Test Widget at Retail (₦1000)
2. Cart now shows:
   - 5 × Test Widget @ ₦700 (wholesale)
   - 2 × Test Widget @ ₦1000 (retail)
3. Subtotal: ₦5500

### Step 5: Checkout
1. Go to Checkout
2. **Verify**: Both items visible with their respective prices
3. Complete sale

### Step 6: Verify Mixed Sale Recorded
1. Check Sales History
2. **Verify**: Sale shows [MIXED] label or indicates "Contains wholesale and retail items"
3. Click on sale to see details - should show pricing mode per item

---

## Test Flow 3: Fallback (Missing Wholesale Price)

### Step 1: Create Product Without Wholesale Price
1. Navigate to Catalog
2. Create new product:
   - Name: "Test Fallback"
   - Retail Price: ₦500
   - Wholesale Price: **Leave empty**
3. Save

### Step 2: POS Wholesale Mode
1. Go to Browse step
2. Set Price Mode to "Wholesale"
3. Add 10 units of "Test Fallback"
4. **Verify**: Price shown is ₦500 (falls back to retail, not wholesale)
5. Proceed to checkout and verify same price

---

## Test Flow 4: History Filtering (When Implemented)

### Prerequisites
- Have multiple sales in history with both Wholesale and Retail

### Steps
1. Navigate to Sales History
2. Look for filter dropdown/button for "Sale Type"
3. **Test**: Filter by "Retail Only"
   - Should show only retail sales
4. **Test**: Filter by "Wholesale Only"
   - Should show only wholesale sales
5. **Test**: Filter by "All"
   - Should show all sales with labels

---

## Expected Outcomes by Feature

### Phase 1: Core POS (✅ COMPLETE)
- ✅ Browse shows Price Mode selector
- ✅ Changing mode affects displayed prices
- ✅ Items added at correct prices
- ✅ Cart displays correct totals
- ✅ Checkout allows mode selection
- ✅ Sale records with pricing mode

### Phase 2: History (⏳ PENDING - Next)
- ⏳ History shows [RETAIL] or [WHOLESALE] badge
- ⏳ Filter dropdown works
- ⏳ Export respects filter selection

### Phase 3: Receipts (⏳ PENDING)
- ⏳ Receipt shows WHOLESALE/RETAIL banner
- ⏳ WhatsApp message includes mode
- ⏳ PDF has mode in header

---

## Debugging Tips

### If prices not changing:
- Check Product has `wholesalePrice` field set
- Verify `price-utils.ts` is imported in Browse
- Check SalesGrid `defaultSaleType` is being passed

### If cart keys wrong:
- Inspect browser console: `cart` Map should show keys like `"item-id:unit:wholesale"`
- Not `"item-id:unit"` (old format)

### If sale not saving:
- Check Console for errors in addSale function
- Verify Firestore has `salePriceMode` field on SaleLineItem objects
- Check transaction has `saleType` field

### TypeScript errors:
- Should be none! Run: `npx tsc --noEmit`
- If you see errors, likely missing type imports

---

## Regression Tests

### Ensure Not Broken:
1. **Standard Retail Sale**: Price Mode = Retail (default)
   - Add items, should use `item.sellingPrice`
   - No new behavior, should work as before

2. **Inventory Stock**: Stock should be respected regardless of mode
   - Adding items uses same stock tracking

3. **Receipt Display**: Receipt should display correctly
   - Mode selector shouldn't break existing receipt layout

4. **History Display**: History should show existing sales
   - New sales should appear with mode label
   - Old sales without mode should still display

5. **Cart Clear**: Changing mode shouldn't affect cart clearing

---

## Quick Reference: File Locations

| Component | File |
|-----------|------|
| Price logic | `src/components/sales/price-utils.ts` |
| Mode selector UI | `src/components/sales/PriceModeSelector.tsx` |
| Browse step | `src/components/sales/SalesStepBrowse.tsx` |
| Checkout step | `src/components/sales/SalesStepCheckout.tsx` |
| Cart step | `src/components/sales/SalesStepCart.tsx` |
| History view | `src/components/sales/SalesHistory.tsx` (needs update) |
| Receipt | `src/components/sales/SalesReceipt.tsx` (needs update) |

