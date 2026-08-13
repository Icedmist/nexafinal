import { useMemo, useRef, useState, useEffect } from "react";
import { Package, Search, X, QrCode, Minus, Plus } from "lucide-react";
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
import type { Item } from "@/types/inventory";
import { cn, extractItemIdentifier } from "@/lib/utils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const added = new Set(lineItems.map((r) => r.itemId));
    return items
      .filter(
        (i) =>
          (i.name.toLowerCase().includes(q) ||
            (i.sku && i.sku.toLowerCase().includes(q)) ||
            (i.barcode && i.barcode.toLowerCase().includes(q))),
      )
      .slice(0, 10);
  }, [items, searchQuery, lineItems]);

  // Close the suggestion dropdown when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handlePick(item: Item) {
    const existingRow = lineItems.find((r) => r.itemId === item.id);
    if (existingRow) {
      onChange(
        lineItems.map((r) =>
          r.id === existingRow.id ? { ...r, quantity: r.quantity + 1 } : r,
        ),
      );
      toast.success(`Incremented ${item.name} quantity`);
    } else {
      const costPrice = item.costPrice || 0;
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
          sellingPrice: item.sellingPrice || 0,
          selectedUnit: item.unit || "",
          conversionFactor: 1,
        },
      ]);
      toast.success(`Added ${item.name}`);
    }
    setSearchQuery("");
    setSearchOpen(false);
  }

  function removeRow(id: string) {
    onChange(lineItems.filter((r) => r.id !== id));
  }

  function updateRow(id: string, field: keyof LineItemRow, value: string | number) {
    onChange(lineItems.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function changeQty(row: LineItemRow, delta: number) {
    updateRow(row.id, "quantity", Math.max(1, row.quantity + delta));
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

    updateRow(rowId, "selectedUnit", unitName);
    updateRow(rowId, "conversionFactor", factor);
  }

  function handleScan(code: string) {
    const cleanCode = extractItemIdentifier(code);
    const item = items.find(
      (i) => i.sku === cleanCode || i.id === cleanCode || i.barcode === cleanCode,
    );

    if (!item) {
      toast.error(`Product with code "${cleanCode}" not found`);
      return;
    }
    handlePick(item);
  }

  const runningTotal = lineItems.reduce((sum, r) => sum + r.quantity * r.unitCost, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">Line Items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsScannerOpen(true)}
          className="gap-1 border-primary/20 hover:bg-primary/5 text-primary"
        >
          <QrCode className="h-3.5 w-3.5" />
          Scan QR
        </Button>
      </div>

      {/* Product search */}
      <div className="relative" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Search products by name, SKU, or barcode…"
          className="h-11 rounded-xl border-2 pl-9 font-medium"
        />
        {searchOpen && searchQuery.trim() && suggestions.length > 0 && (
          <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border-2 border-border bg-card shadow-xl">
            <div className="max-h-64 overflow-y-auto p-1">
              {suggestions.map((s) => {
                const isLow = s.currentStock <= s.reorderPoint;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePick(s)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-muted/60"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {s.emoji ? (
                        <span className="text-base leading-none">{s.emoji}</span>
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                      <p className="truncate font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        {s.sku}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs font-black text-foreground">
                        {NAIRA}
                        {s.sellingPrice?.toLocaleString("en-NG")}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] font-bold",
                          isLow ? "text-amber-600" : "text-emerald-600",
                        )}
                      >
                        Stock: {s.currentStock}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {lineItems.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No line items yet. Search products above to add them.
        </p>
      )}

      {/* Line item cards */}
      {lineItems.length > 0 && (
        <div className="space-y-3">
          {lineItems.map((row) => {
            const item = items.find((i) => i.id === row.itemId);
            const stock = item?.currentStock ?? 0;
            const isLow = !!item && stock <= item.reorderPoint;
            const lineTotal = row.quantity * row.unitCost;
            return (
              <div key={row.id} className="rounded-xl border-2 border-border bg-card p-3 sm:p-4">
                {/* Product header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {item?.emoji ? (
                        <span className="text-base leading-none">{item.emoji}</span>
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {item?.name ?? "Unknown item"}
                      </p>
                      <p className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        {item?.sku ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          isLow
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
                        )}
                      >
                        <Package className="h-3 w-3" />
                        {stock}
                      </span>
                    )}
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

                {/* Fields */}
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Unit
                    </Label>
                    <Select
                      value={row.selectedUnit || item?.unit || "__none__"}
                      onValueChange={(v) => handleUnitChange(row.id, v)}
                      disabled={!row.itemId}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {item && (
                          <>
                            <SelectItem value={item.unit}>
                              {item.unit} (1x)
                            </SelectItem>
                            {item.units?.map((u) => (
                              <SelectItem key={u.name} value={u.name}>
                                {u.name} ({u.conversionFactor}x)
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Qty
                    </Label>
                    <div className="flex h-9 items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => changeQty(row, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        className="h-9 flex-1 min-w-0 text-center font-mono text-xs px-1"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(row.id, "quantity", Math.max(1, Number(e.target.value) || 1))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => changeQty(row, 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Cost
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-9 text-xs font-bold"
                      value={row.unitCost}
                      onChange={(e) =>
                        updateRow(row.id, "unitCost", Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Price
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-9 text-xs font-bold border-primary/20"
                      value={row.sellingPrice}
                      onChange={(e) =>
                        updateRow(row.id, "sellingPrice", Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </div>
                </div>

                {/* Line total */}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Line Total
                  </span>
                  <span className="font-mono text-sm font-black text-foreground">
                    {NAIRA}
                    {lineTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {lineItems.length > 0 && (
        <div className="flex justify-end border-t border-border pt-3">
          <span className="text-sm font-medium text-foreground">
            Total:{" "}
            <span className="font-mono text-base">
              {NAIRA}
              {runningTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
            </span>
          </span>
        </div>
      )}

      <QRScannerDialog open={isScannerOpen} onOpenChange={setIsScannerOpen} onScan={handleScan} />
    </div>
  );
}
