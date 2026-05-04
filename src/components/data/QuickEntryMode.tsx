import React, { useState, useRef, useCallback, useEffect } from "react";
import { ScanBarcode, X, Box, Info, History, ArrowRightCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useItems } from "@/hooks/useInventoryData";
import { useCreateMovement } from "@/hooks/useInventoryMutations";
import { MovementType } from "@/types/inventory";
import type { Item, StockMovement } from "@/types/inventory";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/FirebaseAuthContext";

interface QuickEntryModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEntryMode({ open, onOpenChange }: QuickEntryModeProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [foundItem, setFoundItem] = useState<Item | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<MovementType>(MovementType.Received);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: items = [] } = useItems();
  const createMovement = useCreateMovement();
  const { user } = useAuth();

  // Auto-focus input when opened or after action
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const resetForm = useCallback(() => {
    setFoundItem(null);
    setNotFound(null);
    setMovementType(MovementType.Received);
    setQuantity("");
    setNotes("");
    setBarcodeInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleLookup = useCallback(() => {
    const query = barcodeInput.trim();
    if (!query) return;

    const item = items.find(
      (i) => i.barcode?.toLowerCase() === query.toLowerCase() || i.sku.toLowerCase() === query.toLowerCase()
    );

    if (item) {
      setFoundItem(item);
      setNotFound(null);
    } else {
      setFoundItem(null);
      setNotFound(query);
    }
  }, [barcodeInput, items]);

  const handleSubmit = useCallback(() => {
    if (!foundItem || !quantity) return;

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      itemId: foundItem.id,
      type: movementType,
      quantity: Number(quantity),
      fromLocationId: null,
      toLocationId: null,
      reference: `Quick Entry`,
      notes,
      performedBy: user?.email || "System",
      createdAt: new Date().toISOString(),
    };

    createMovement.mutate(movement, {
      onSuccess: () => {
        toast.success(`Logged: ${quantity} × ${foundItem.name}`);
        resetForm();
      },
    });
  }, [foundItem, movementType, quantity, notes, createMovement, resetForm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (foundItem || notFound) {
        resetForm();
      } else {
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none" onKeyDown={handleKeyDown}>
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <ScanBarcode className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Quick Entry</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rapid Stock Adjustment</span>
                </div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-6">
              {/* Barcode input */}
              <div className="space-y-2 px-1">
                <Label htmlFor="barcode-scan" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Barcode / SKU Scanner</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode-scan"
                    ref={inputRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
                    placeholder="Scan product barcode..."
                    className="h-14 text-xl font-mono font-black rounded-xl border-2 px-4 shadow-sm focus:ring-primary/20"
                    autoFocus
                    autoComplete="off"
                  />
                  <Button onClick={handleLookup} className="h-14 px-6 rounded-xl font-black uppercase text-xs tracking-widest" disabled={!barcodeInput.trim()}>
                    Identify
                  </Button>
                </div>
              </div>

              {/* Not found */}
              {notFound && (
                <div className="rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-lg font-black text-destructive">Item Not Found</p>
                  <p className="mt-1 font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{notFound}</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-lg border-2 font-bold" onClick={resetForm}>
                    Clear and Retry
                  </Button>
                </div>
              )}

              {/* Found item */}
              {foundItem && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-500">
                  <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 group relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border-2 border-primary/10">
                           <Box className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-black text-foreground">{foundItem.name}</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{foundItem.sku}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={resetForm}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                       <div className="px-3 py-1 rounded-full bg-white border border-primary/10 text-[10px] font-black uppercase tracking-widest text-primary">
                          In Stock: {foundItem.currentStock}
                       </div>
                    </div>
                  </div>

                  {/* Compact movement form */}
                  <div className="space-y-4 px-1">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Action Type</Label>
                        <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                          <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value={MovementType.Received} className="font-bold">Stock In (Receive)</SelectItem>
                            <SelectItem value={MovementType.Shipped} className="font-bold">Stock Out (Ship)</SelectItem>
                            <SelectItem value={MovementType.Adjusted} className="font-bold">Adjustment</SelectItem>
                            <SelectItem value={MovementType.Transferred} className="font-bold">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="0"
                          className="h-11 rounded-xl border-2 font-mono font-black"
                          onKeyDown={(e) => { if (e.key === "Enter" && quantity) handleSubmit(); }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 ml-1">
                        <Info className="h-3 w-3 text-muted-foreground" />
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Log Notes</Label>
                      </div>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional reason for this movement..."
                        className="rounded-xl border-2 font-bold resize-none"
                        rows={2}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={handleSubmit}
                        disabled={!quantity || createMovement.isLoading}
                        className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 group"
                      >
                        {createMovement.isLoading ? "Processing..." : "Commit Movement"}
                        <CheckCircle2 className="ml-2 h-4 w-4 opacity-50 group-hover:opacity-100" />
                      </Button>
                      <Button type="button" variant="ghost" onClick={resetForm} className="w-full mt-2 font-bold text-muted-foreground">
                        Clear Item
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
