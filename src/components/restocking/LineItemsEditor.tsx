import { Plus, X, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { QRScannerDialog } from "../shared/QRScannerDialog";
import { toast } from "sonner";
import { useState } from "react";
import type { Item } from "@/types/inventory";

const NAIRA = "₦";

export interface LineItemRow {
  id: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  selectedUnit?: string;
  conversionFactor?: number;
}

interface LineItemsEditorProps {
  items: Item[];
  lineItems: LineItemRow[];
  onChange: (rows: LineItemRow[]) => void;
  error?: string;
}

export function LineItemsEditor({ items, lineItems, onChange, error }: LineItemsEditorProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  function addRow() {
    onChange([
      ...lineItems,
      { id: crypto.randomUUID(), itemId: "", quantity: 1, unitCost: 0, sellingPrice: 0, selectedUnit: "", conversionFactor: 1 },
    ]);
  }

  function removeRow(id: string) {
    onChange(lineItems.filter((r) => r.id !== id));
  }

  function updateRow(id: string, field: keyof LineItemRow, value: string | number) {
    onChange(
      lineItems.map((r) =>
        r.id === id ? { ...r, [field]: value } : r,
      ),
    );
  }

  function handleScan(code: string) {
    // Find item by SKU or ID
    const item = items.find((i) => i.sku === code || i.id === code);
    
    if (!item) {
      toast.error(`Product with code "${code}" not found`);
      return;
    }

    // Check if item already in list
    const existingRow = lineItems.find((r) => r.itemId === item.id);
    
    if (existingRow) {
      // Increment quantity
      onChange(
        lineItems.map((r) =>
          r.id === existingRow.id ? { ...r, quantity: r.quantity + 1 } : r
        )
      );
      toast.success(`Incremented ${item.name} quantity`);
    } else {
      // Add new row
      const costPrice = item.costPrice || 0;
      const sellingPrice = item.sellingPrice || 0;

      if (costPrice === 0) {
        toast.warning(`${item.name} has no default cost price. Please enter it manually.`);
      }

      onChange([
        ...lineItems,
        { 
          id: crypto.randomUUID(), 
          itemId: item.id, 
          quantity: 1, 
          unitCost: costPrice,
          sellingPrice: sellingPrice,
          selectedUnit: item.unit || "",
          conversionFactor: 1
        },
      ]);
      toast.success(`Added ${item.name} to list`);
    }
  }

  function handleItemSelect(rowId: string, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    onChange(
      lineItems.map((r) =>
        r.id === rowId
          ? { 
              ...r, 
              itemId, 
              unitCost: item?.costPrice ?? r.unitCost,
              sellingPrice: item?.sellingPrice ?? r.sellingPrice,
              selectedUnit: item?.unit || "",
              conversionFactor: 1
            }
          : r,
      ),
    );
  }

  function handleUnitChange(rowId: string, unitName: string) {
    const row = lineItems.find((r) => r.id === rowId);
    if (!row) return;

    const item = items.find((i) => i.id === row.itemId);
    if (!item) return;

    let factor = 1;
    if (unitName !== item.unit) {
      const uom = item.units?.find((u) => u.name === unitName);
      if (uom) factor = uom.conversionFactor;
    }

    onChange(
      lineItems.map((r) =>
        r.id === rowId ? { ...r, selectedUnit: unitName, conversionFactor: factor } : r,
      ),
    );
  }

  const runningTotal = lineItems.reduce(
    (sum, r) => sum + r.quantity * r.unitCost,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Line Items</Label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsScannerOpen(true)} className="gap-1 border-primary/20 hover:bg-primary/5 text-primary">
            <QrCode className="h-3.5 w-3.5" />
            Scan QR
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>
      </div>

      {lineItems.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No line items. Click "Add Item" to start.
        </p>
      )}

      {lineItems.map((row, idx) => {
        const lineTotal = row.quantity * row.unitCost;
        return (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_120px_60px_90px_90px_80px_32px] items-end gap-2 rounded-md border border-border bg-muted/30 p-3"
          >
            {/* Item select */}
            <div>
              {idx === 0 && (
                <Label className="mb-1 block text-xs text-muted-foreground">Item</Label>
              )}
              <Select
                value={row.itemId || "__none__"}
                onValueChange={(v) => handleItemSelect(row.id, v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Select item</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit Selection */}
            <div>
              {idx === 0 && (
                <Label className="mb-1 block text-xs text-muted-foreground">Unit</Label>
              )}
              <Select
                value={row.selectedUnit || "__none__"}
                onValueChange={(v) => handleUnitChange(row.id, v)}
                disabled={!row.itemId}
              >
                <SelectTrigger className="h-8 text-[10px] font-bold">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {row.itemId && (
                    <>
                      <SelectItem value={items.find(i => i.id === row.itemId)?.unit || "Base"}>
                        {items.find(i => i.id === row.itemId)?.unit || "Base"} (1x)
                      </SelectItem>
                      {items.find(i => i.id === row.itemId)?.units?.map((u) => (
                        <SelectItem key={u.name} value={u.name}>
                          {u.name} ({u.conversionFactor}x)
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div>
              {idx === 0 && (
                <Label className="mb-1 block text-xs text-muted-foreground">Qty</Label>
              )}
              <Input
                type="number"
                min={1}
                className="h-8 text-xs"
                value={row.quantity}
                onChange={(e) => updateRow(row.id, "quantity", Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            {/* Unit Cost */}
            <div>
              {idx === 0 && (
                <Label className="mb-1 block text-[10px] uppercase tracking-tighter text-muted-foreground">Cost</Label>
              )}
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-8 text-xs font-bold"
                value={row.unitCost}
                onChange={(e) => updateRow(row.id, "unitCost", Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            {/* Selling Price */}
            <div>
              {idx === 0 && (
                <Label className="mb-1 block text-[10px] uppercase tracking-tighter text-muted-foreground">Price</Label>
              )}
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-8 text-xs font-bold border-primary/20"
                value={row.sellingPrice}
                onChange={(e) => updateRow(row.id, "sellingPrice", Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            {/* Line total */}
            <div>
              {idx === 0 && (
                <Label className="mb-1 block text-[10px] uppercase tracking-tighter text-muted-foreground">Total</Label>
              )}
              <span className="flex h-8 items-center text-[10px] font-mono font-black text-foreground">
                {NAIRA}{lineTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
              </span>
            </div>

            {/* Remove */}
            <div>
              {idx === 0 && <div className="mb-1 h-4" />}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(row.id)}
                aria-label="Remove line item"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {lineItems.length > 0 && (
        <div className="flex justify-end border-t border-border pt-3">
          <span className="text-sm font-medium text-foreground">
            Total:{" "}
            <span className="font-mono text-base">
              {NAIRA}{runningTotal.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </span>
        </div>
      )}

      <QRScannerDialog 
        open={isScannerOpen} 
        onOpenChange={setIsScannerOpen} 
        onScan={handleScan} 
      />
    </div>
  );
}
