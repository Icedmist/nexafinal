import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MovementType } from "@/types/inventory";
import type { Item, Location, StockMovement } from "@/types/inventory";
import { useCreateMovement } from "@/hooks/useInventoryMutations";
import { PackagePlus, X } from "lucide-react";
import { useAuth } from "@/contexts/FirebaseAuthContext";

interface MovementFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  locations: Location[];
  /** Pre-selected item (locks the field) */
  preSelectedItemId?: string | null;
}

const TYPE_OPTIONS = [
  { value: MovementType.Received, label: "Received" },
  { value: MovementType.Shipped, label: "Shipped" },
  { value: MovementType.Adjusted, label: "Adjusted" },
  { value: MovementType.Transferred, label: "Transferred" },
];

function directionForType(type: MovementType): "in" | "out" | "configurable" {
  if (type === MovementType.Received) return "in";
  if (type === MovementType.Shipped) return "out";
  if (type === MovementType.Transferred) return "out";
  return "configurable";
}

export function MovementFormSheet({
  open,
  onOpenChange,
  items,
  locations,
  preSelectedItemId,
}: MovementFormSheetProps) {
  const { mutate, isLoading } = useCreateMovement();
  const { user } = useAuth();

  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<MovementType>(MovementType.Received);
  const [quantity, setQuantity] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [reference, setReference] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setItemId(preSelectedItemId ?? "");
      setType(MovementType.Received);
      setQuantity("");
      setDirection("in");
      setReference("");
      setFromLocationId("");
      setToLocationId("");
      setUnitPrice("");
      setErrors({});
    }
  }, [open, preSelectedItemId]);

  // Auto-set direction when type changes
  useEffect(() => {
    const dir = directionForType(type);
    if (dir !== "configurable") setDirection(dir);
  }, [type]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!itemId) errs.itemId = "Item is required";

    const num = Number(quantity);
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty <= 0 || !Number.isInteger(num)) {
      errs.quantity = "Quantity must be a positive integer";
    }

    const selectedItem = items.find((i) => i.id === itemId);

    // Shipped: cannot exceed current stock
    if (!errs.quantity && selectedItem && (type === MovementType.Shipped || (type === MovementType.Transferred))) {
      if (qty > selectedItem.currentStock) {
        errs.quantity = `Insufficient stock. Current quantity: ${selectedItem.currentStock}`;
      }
    }

    // Adjusted out: also cannot exceed current stock
    if (!errs.quantity && selectedItem && type === MovementType.Adjusted && direction === "out") {
      if (qty > selectedItem.currentStock) {
        errs.quantity = `Insufficient stock. Current quantity: ${selectedItem.currentStock}`;
      }
    }

    // Adjusted: note required
    if (type === MovementType.Adjusted && !reference.trim()) {
      errs.reference = "Reason for adjustment is required";
    }

    // Transferred: both locations required and different
    if (type === MovementType.Transferred) {
      if (!fromLocationId) errs.fromLocationId = "Source location is required";
      if (!toLocationId) errs.toLocationId = "Destination location is required";
      if (fromLocationId && toLocationId && fromLocationId === toLocationId) {
        errs.toLocationId = "Source and destination must differ";
      }
      // Transfers are sales between managers: a transfer price is required
      const price = Number(unitPrice);
      if (!unitPrice || isNaN(price) || price < 0) {
        errs.unitPrice = "Enter a valid transfer price";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const qty = parseInt(quantity, 10);
    const selectedItem = items.find((i) => i.id === itemId);
    const signedQty = direction === "in" ? qty : -qty;
    const unitPriceValue = type === MovementType.Transferred ? Number(unitPrice) || 0 : 0;

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      itemId,
      type,
      quantity: signedQty,
      fromLocationId: type === MovementType.Transferred ? fromLocationId || null : null,
      toLocationId: type === MovementType.Transferred ? toLocationId || null : null,
      reference,
      notes: reference,
      performedBy: user?.email || "System",
      unitPrice: unitPriceValue,
      value: unitPriceValue * qty,
      createdAt: new Date().toISOString(),
    };

    mutate(movement, {
      onSuccess: () => {
        const label = selectedItem?.name ?? itemId;
        const sign = direction === "in" ? "+" : "−";
        toast.success(`Movement logged: ${sign}${qty} ${label} (${type})`, {
          duration: 5000,
        });
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message || "Failed to log movement. Please try again."),
    });
  };

  const isTransfer = type === MovementType.Transferred;
  const isAdjusted = type === MovementType.Adjusted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PackagePlus className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight">Log Stock Movement</DialogTitle>
            </div>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Item */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Item *</Label>
              <Select
                value={itemId || "__none__"}
                onValueChange={(v) => {
                  setItemId(v === "__none__" ? "" : v);
                  const item = items.find((i) => i.id === v);
                  if (item?.sellingPrice != null) {
                    setUnitPrice(String(item.sellingPrice));
                  }
                }}
                disabled={!!preSelectedItemId}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 transition-all focus:ring-primary/20">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="__none__" disabled>Select item</SelectItem>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.itemId && <p className="mt-1 text-[10px] font-bold text-destructive px-1">{errors.itemId}</p>}
            </div>

            {/* Type & Quantity Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Movement Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
                  <SelectTrigger className="h-11 rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  className="h-11 rounded-xl border-2 font-mono font-bold"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {errors.quantity && <p className="mt-1 text-[10px] font-bold text-destructive px-1">{errors.quantity}</p>}
              </div>
            </div>

            {/* Direction (only for adjusted) */}
            {isAdjusted && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as "in" | "out")}>
                  <SelectTrigger className="h-11 rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="in">In (Add to stock)</SelectItem>
                    <SelectItem value="out">Out (Remove from stock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Transfer locations */}
            {isTransfer && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border border-border/50">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</Label>
                  <Select value={fromLocationId || "__none__"} onValueChange={(v) => setFromLocationId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-10 rounded-lg border bg-background">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>Select</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fromLocationId && <p className="mt-1 text-[10px] font-bold text-destructive">{errors.fromLocationId}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination</Label>
                  <Select value={toLocationId || "__none__"} onValueChange={(v) => setToLocationId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-10 rounded-lg border bg-background">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>Select</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.toLocationId && <p className="mt-1 text-[10px] font-bold text-destructive">{errors.toLocationId}</p>}
                </div>
              </div>
            )}

            {/* Prices — transfers are sales between managers */}
            {isTransfer && (
              <div className="space-y-2 p-4 rounded-2xl border-2 border-primary/20 bg-primary/5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Transfer Price
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Transfers are recorded as sales from one store manager to another.
                  The total is auto-calculated from the unit price × quantity.
                </p>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className="h-11 rounded-xl border-2 font-mono font-bold"
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
                {errors.unitPrice && <p className="mt-1 text-[10px] font-bold text-destructive">{errors.unitPrice}</p>}
                <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3 border-2 border-dashed border-primary/20">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Total Transfer Value
                    </span>
                    <span className="text-[9px] text-muted-foreground/60">
                      Auto-calculated as quantity changes
                    </span>
                  </div>
                  <span className="font-mono font-black text-lg text-primary">
                    ₦{((Number(unitPrice) || 0) * (Number(quantity) || 0)).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Reference note */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notes{isAdjusted ? " *" : ""}</Label>
              <Textarea
                placeholder={isAdjusted ? "Reason for adjustment (required)" : "Optional note or reference"}
                className="rounded-xl border-2 resize-none min-h-[80px]"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                rows={3}
              />
              {errors.reference && <p className="mt-1 text-[10px] font-bold text-destructive px-1">{errors.reference}</p>}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={isLoading} className="flex-1 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
                {isLoading ? "Saving…" : "Log Movement"}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-12 font-bold px-6">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
