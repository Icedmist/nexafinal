import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, Info, Check, Plus, Minus, ChefHat, ChevronDown } from "lucide-react";
import type { Item } from "@/types/inventory";
import { cn } from "@/lib/utils";

const NAIRA = "₦";

interface DishCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onAddConfigured: (itemId: string, qty: number, unitId: string, configString: string) => void;
}

export function DishCustomizerDialog({
  open,
  onOpenChange,
  item,
  onAddConfigured,
}: DishCustomizerDialogProps) {
  const [selectedSize, setSelectedSize] = useState<{ id: string; name: string; price: number } | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<{ id: string; name: string; price: number }[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<string>("");
  const [kitchenNote, setKitchenNote] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (item && open) {
      // Default to first size if available
      if (item.menuItemConfig?.sizes && item.menuItemConfig.sizes.length > 0) {
        setSelectedSize(item.menuItemConfig.sizes[0]);
      } else {
        setSelectedSize({ id: "regular", name: "Regular", price: item.sellingPrice });
      }

      // Default to first spice level
      if (item.menuItemConfig?.spiceLevels && item.menuItemConfig.spiceLevels.length > 0) {
        setSpiceLevel(item.menuItemConfig.spiceLevels[0]);
      } else {
        setSpiceLevel("");
      }

      setSelectedAddons([]);
      setKitchenNote("");
      setQty(1);
    }
  }, [item, open]);

  if (!item) return null;

  // Calculate live price
  const calculateLivePrice = () => {
    let basePrice = selectedSize ? selectedSize.price : item.sellingPrice;
    
    // Addons price
    const addonSum = selectedAddons.reduce((s, a) => s + a.price, 0);
    basePrice += addonSum;

    return basePrice * qty;
  };

  const handleAddonToggle = (addon: { id: string; name: string; price: number }, checked: boolean) => {
    if (checked) {
      setSelectedAddons((prev) => [...prev, addon]);
    } else {
      setSelectedAddons((prev) => prev.filter((a) => a.id !== addon.id));
    }
  };

  const handleAddValue = () => {
    const config = {
      size: selectedSize,
      addons: selectedAddons,
      spiceLevel: spiceLevel || undefined,
      note: kitchenNote.trim() || undefined,
    };

    const configString = JSON.stringify(config);
    onAddConfigured(item.id, qty, item.unit, configString);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-border p-6 shadow-2xl bg-card">
        <DialogHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-2xl border border-orange-200/50">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-foreground">{item.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure dish, select portions, and add live kitchen instructions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Size Selection */}
          {item.menuItemConfig?.sizes && item.menuItemConfig.sizes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Portion Size (Required)</Label>
              <RadioGroup
                value={selectedSize?.id}
                onValueChange={(val) => {
                  const selected = item.menuItemConfig?.sizes?.find((s) => s.id === val);
                  if (selected) setSelectedSize(selected);
                }}
                className="grid grid-cols-2 gap-2"
              >
                {item.menuItemConfig.sizes.map((size) => (
                  <div key={size.id}>
                    <RadioGroupItem value={size.id} id={`size-${size.id}`} className="sr-only" />
                    <Label
                      htmlFor={`size-${size.id}`}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border bg-card/40 cursor-pointer transition-all hover:bg-muted/30 hover:border-primary/50 text-center",
                        selectedSize?.id === size.id
                          ? "border-primary bg-primary/5 text-primary shadow-xs ring-1 ring-primary/30"
                          : "border-border text-foreground"
                      )}
                    >
                      <span className="text-sm font-bold">{size.name}</span>
                      <span className="text-xs text-muted-foreground font-mono mt-1">{NAIRA}{size.price.toLocaleString("en-NG")}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Optional Add-ons */}
          {item.menuItemConfig?.addons && item.menuItemConfig.addons.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Extras (Optional)</Label>
              <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-muted/10 p-3">
                {item.menuItemConfig.addons.map((addon) => {
                  const isChecked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <div key={addon.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center space-x-2.5">
                        <Checkbox
                          id={`addon-${addon.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleAddonToggle(addon, !!checked)}
                          className="rounded-md"
                        />
                        <Label htmlFor={`addon-${addon.id}`} className="text-sm font-medium text-foreground cursor-pointer">
                          {addon.name}
                        </Label>
                      </div>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {addon.price > 0 ? `+${NAIRA}${addon.price.toLocaleString("en-NG")}` : "Free"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spice Level */}
          {item.menuItemConfig?.spiceLevels && item.menuItemConfig.spiceLevels.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Spice Preferences</Label>
              <div className="flex flex-wrap gap-1.5">
                {item.menuItemConfig.spiceLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSpiceLevel(level)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                      spiceLevel === level
                        ? "bg-red-500 border-red-500 text-white shadow-xs"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Flame className={cn("h-3.5 w-3.5", spiceLevel === level ? "text-white animate-pulse" : "text-amber-500")} />
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kitchen note free-text */}
          {item.menuItemConfig?.allowKitchenNotes && (
            <div className="space-y-2">
              <Label htmlFor="kitchen-note" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kitchen Instructions</Label>
              <Input
                id="kitchen-note"
                placeholder='e.g., "no onions", "extra spicy", "separate plates"'
                value={kitchenNote}
                onChange={(e) => setKitchenNote(e.target.value)}
                className="rounded-xl border border-border h-11 text-xs"
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-8 pt-4 border-t border-border/60 flex flex-row items-center justify-between gap-4">
          {/* Quantity selector */}
          <div className="flex items-center gap-3 bg-muted/40 border border-border p-1.5 rounded-2xl">
            <button
              type="button"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded-xl bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all border border-border"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold font-mono min-w-6 text-center">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="h-8 w-8 rounded-xl bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all border border-border"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={handleAddValue}
            className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold tracking-tight text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <Check className="h-4 w-4" />
            Add to order · {NAIRA}{calculateLivePrice().toLocaleString("en-NG", { minimumFractionDigits: 0 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
