# Phase 2 & 3 Implementation Roadmap

## Overview
The core POS wholesale/retail pricing is complete. This document outlines the remaining UI/display features needed for full feature completion.

## Phase 2: Sales History Display (HIGH PRIORITY)

### Component: `src/components/sales/SalesHistory.tsx`

#### Task 2.1: Add Sale Type Badge to History Cards
**File**: `SalesHistory.tsx`  
**What**: Display visual badge showing (RETAIL) or (WHOLESALE) on each sale card

**Implementation**:
```typescript
import { SaleTypeBadge } from "./SaleTypeBadge";

// In the sale card rendering, add:
<div className="flex items-start justify-between">
  <div>
    <h3>Sale #{sale.id}</h3>
    <p className="text-sm text-muted-foreground">{formattedDate}</p>
  </div>
  <SaleTypeBadge mode={sale.saleType} />
</div>
```

**Time Estimate**: 5 minutes  
**Dependencies**: SaleTypeBadge.tsx (already created)

---

#### Task 2.2: Add Sale Type Filter to History
**File**: `SalesHistory.tsx`  
**What**: Add dropdown filter above sale cards to show All / Retail Only / Wholesale Only

**Implementation Steps**:
1. Add state: `const [saleTypeFilter, setSaleTypeFilter] = useState<"all" | "retail" | "wholesale">("all");`
2. Add filter UI (use Select component from @/components/ui/select):
   ```typescript
   <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
     <SelectTrigger className="w-40">
       <SelectValue />
     </SelectTrigger>
     <SelectContent>
       <SelectItem value="all">All Sales</SelectItem>
       <SelectItem value="retail">Retail Only</SelectItem>
       <SelectItem value="wholesale">Wholesale Only</SelectItem>
     </SelectContent>
   </Select>
   ```
3. Filter sales before rendering:
   ```typescript
   const filteredSales = sales.filter(sale => {
     if (saleTypeFilter === "all") return true;
     return sale.saleType === saleTypeFilter;
   });
   ```
4. Render filteredSales instead of sales

**Time Estimate**: 10 minutes  
**Files Modified**: SalesHistory.tsx only

---

#### Task 2.3: Update Export Functions to Include Sale Type
**File**: `src/lib/pdf-export.ts`  
**What**: Pass sale type to PDF export so it shows in tables

**Implementation**:
1. Find function: `exportSalesHistoryPDF(sales, businessName)`
2. Add column to PDF table:
   ```typescript
   // In table column headers
   { header: 'Type', dataKey: 'saleType', halign: 'center', valign: 'middle' }
   
   // In data mapping
   saleType: sale.saleType || 'retail',
   ```
3. Add filter parameter to function (optional, nice-to-have):
   ```typescript
   export function exportSalesHistoryPDF(
     sales: SaleTransaction[],
     businessName: string,
     filterType?: "retail" | "wholesale" | "all"
   ) {
     const filtered = filterType === "all" || !filterType 
       ? sales 
       : sales.filter(s => s.saleType === filterType);
     // ... rest of function
   }
   ```

**Time Estimate**: 10 minutes  
**Files Modified**: pdf-export.ts

---

### Phase 2 Validation Checklist
- [ ] SalesHistory shows badge for each sale
- [ ] Filter dropdown works (filters display correctly)
- [ ] Badge shows correct color for wholesale (amber) vs retail (blue)
- [ ] PDF export includes saleType column
- [ ] History still loads and displays without errors
- [ ] Filter includes all three options and switches work

---

## Phase 3: Receipt & Export Enhancements (MEDIUM PRIORITY)

### Component: `src/components/sales/SalesReceipt.tsx`

#### Task 3.1: Display Sale Type on Receipt
**File**: `SalesReceipt.tsx`  
**What**: Show WHOLESALE or RETAIL banner on receipt screen

**Implementation**:
```typescript
import { SaleTypeBadge } from "./SaleTypeBadge";

// In receipt header, add:
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-bold">RECEIPT</h2>
  <SaleTypeBadge mode={sale.saleType} className="text-base" />
</div>
```

**Time Estimate**: 5 minutes

---

#### Task 3.2: Include Sale Type in WhatsApp Message
**File**: `SalesReceipt.tsx`  
**What**: Update buildReceiptText() to include pricing mode

**Current Code Location**: Look for `buildReceiptText(sale)` function  
**Modification**:
```typescript
const modeLabel = sale.saleType === "wholesale" ? "WHOLESALE" : "RETAIL";
const text = `
...existing content...
*${modeLabel} SALE*
...rest of message...
`;
```

**Time Estimate**: 5 minutes

---

### Component: `src/lib/pdf-export.ts`

#### Task 3.3: Enhanced PDF Receipt with Sale Type
**File**: `pdf-export.ts`  
**What**: Update PDF receipt generation to show sale type

**Implementation**:
1. Find: `generatePDFReceipt()` or similar
2. Add sale type to header section:
   ```typescript
   // Add after business name
   pdf.setFontSize(14);
   pdf.setFont(undefined, 'bold');
   pdf.text(
     sale.saleType?.toUpperCase() || 'RETAIL',
     pageWidth / 2,
     currentY,
     { align: 'center' }
   );
   ```
3. Test PDF generation still works

**Time Estimate**: 10 minutes

---

#### Task 3.4: Add Sale Type Breakdown to Summary
**File**: `pdf-export.ts`  
**What**: Add summary metrics showing breakdown by sale type (optional, nice-to-have)

**Implementation**:
```typescript
// In summary section
const retailCount = sales.filter(s => s.saleType !== "wholesale").length;
const wholesaleCount = sales.filter(s => s.saleType === "wholesale").length;
const retailTotal = sales
  .filter(s => s.saleType !== "wholesale")
  .reduce((sum, s) => sum + s.totalNgn, 0);
const wholesaleTotal = sales
  .filter(s => s.saleType === "wholesale")
  .reduce((sum, s) => sum + s.totalNgn, 0);

// Add to PDF
pdf.text(`Retail Sales: ${retailCount} (₦${retailTotal.toLocaleString()})`, ...);
pdf.text(`Wholesale Sales: ${wholesaleCount} (₦${wholesaleTotal.toLocaleString()})`, ...);
```

**Time Estimate**: 15 minutes (optional)

---

### Phase 3 Validation Checklist
- [ ] Receipt displays WHOLESALE or RETAIL badge
- [ ] WhatsApp message includes sale type
- [ ] PDF receipt shows sale type in header
- [ ] PDF still generates without errors
- [ ] Summary breakdown shows correctly (if implemented)

---

## Phase 4: Analytics & Reporting (LOWER PRIORITY)

### Potential Enhancements (For Future Consideration)
- Dashboard card: "Sales by Type" showing retail vs wholesale breakdown
- Analytics page: Filter all metrics by sale type
- CSV export: Add saleType column for external analysis
- Timeline chart: Show retail vs wholesale sales over time
- Supplier cost analysis: Only include wholesale purchases
- Profit margin: Calculate separately for retail vs wholesale

---

## Implementation Order (Recommended)

### Day 1 (1-2 hours):
1. **2.1** - Add SaleTypeBadge to history (5 min)
2. **2.2** - Add filter dropdown (10 min)
3. **3.1** - Add badge to receipt (5 min)
4. **3.2** - Add to WhatsApp message (5 min)
5. **2.3** - Update PDF export table (10 min)

**Result**: Users can see and filter sales by type, badges visible everywhere

### Day 2 (Optional, 30 min):
1. **3.3** - Enhanced PDF receipt (10 min)
2. **3.4** - Summary breakdown (15 min, optional)

**Result**: Complete PDF and reporting enhancements

---

## Testing Checklist (After Each Phase)

### After Phase 2:
- [ ] Add a wholesale sale
- [ ] View in history - see badge
- [ ] Filter to "Wholesale Only" - shows only that sale
- [ ] Filter to "Retail Only" - hides that sale
- [ ] Export PDF - includes type column
- [ ] Add a retail sale
- [ ] Filter to "All" - shows both
- [ ] Filter to "Retail Only" - shows only retail
- [ ] Filter to "Wholesale Only" - shows only wholesale

### After Phase 3:
- [ ] Complete a sale
- [ ] View receipt - shows mode badge
- [ ] Click WhatsApp - message includes WHOLESALE or RETAIL
- [ ] Export receipt to PDF - shows mode in header
- [ ] Summary shows breakdown correctly

---

## Code Review Checklist

When implementing, ensure:
- ✅ All imports added (don't forget SalePriceMode types)
- ✅ No TypeScript errors (run `npx tsc --noEmit`)
- ✅ Filter maintains default state correctly
- ✅ Empty states handled (no sales matching filter)
- ✅ PDF dimensions still correct after adding columns
- ✅ Mobile responsive (if SalesHistory has responsive design)
- ✅ Accessibility: filter has proper labels
- ✅ No breaking changes to existing functionality

---

## File Dependencies Reference

```
SalesHistory.tsx
├── imports SaleTypeBadge.tsx
├── imports Select from @/components/ui/select
└── renders sale cards with badges and filter

SalesReceipt.tsx
├── imports SaleTypeBadge.tsx
└── calls buildReceiptText() with mode info

pdf-export.ts
├── exports exportSalesHistoryPDF()
├── exports generatePDFReceipt()
└── uses sale.saleType and sale.saleMode fields
```

---

## Common Pitfalls to Avoid

1. **Forgetting Optional Chaining**: Use `sale.saleType ?? "retail"` (old sales might not have it)
2. **Type Mismatches**: Ensure SalePriceMode is imported wherever used
3. **Filter State Bugs**: Remember to initialize filter state on component mount
4. **Empty Results**: Handle case where filter removes all sales (show message)
5. **PDF Layout**: Test PDF doesn't overflow with new column
6. **Backward Compat**: Old sales without saleType field should still display

---

## Success Metrics

When complete, users should be able to:
- ✅ View any sale and immediately see if it was wholesale or retail
- ✅ Filter history to show only wholesale or retail sales
- ✅ Export a PDF report with sale type breakdown
- ✅ See pricing mode on receipt
- ✅ Share WhatsApp message indicating the sale type used

