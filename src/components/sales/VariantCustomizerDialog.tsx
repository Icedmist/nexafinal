import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Check, Tag, Layers } from "lucide-react";
import type { Item } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAIRA = "₦";

interface VariantCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onAddConfigured: (itemId: string, qty: number, unitId: string, configString: string) => void;
}

export function VariantCustomizerDialog({
  open,
  onOpenChange,
  item,
  onAddConfigured,
}: VariantCustomizerDialogProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (item && open) {
      // Default to first variant if available
      if (item.variants && item.variants.length > 0) {
        const firstVariant = item.variants[0];
        const variantKey = Object.values(firstVariant.attributes).join(" - ");
        setSelectedVariant(variantKey);
      }
      setSelectedUnit(item.unit);
      setQty(1);
    }
  }, [item, open]);

  // Get unique values for each attribute
  const getAttributeValues = (attribute: string): string[] => {
    if (!item?.variants) return [];
    const values = new Set<string>();
    item.variants.forEach(v => {
      const val = v.attributes[attribute];
      if (val) values.add(val);
    });
    return Array.from(values);
  };

  // Get current attribute values from variantAttributes
  const attributes = item?.variantAttributes || [];
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item && open) {
      const initial: Record<string, string> = {};
      attributes.forEach(attr => {
        const values = getAttributeValues(attr);
        if (values.length > 0) {
          initial[attr] = values[0];
        }
      });
      setSelectedAttributeValues(initial);
    }
  }, [item, open]);

  if (!item) return null;

  const handleAdd = () => {
    const config = {
      attributes: selectedAttributeValues,
    };
    const configString = JSON.stringify(config);
    const unitToUse = selectedUnit || item.unit;
    onAddConfigured(item.id, qty, unitToUse, configString);
    onOpenChange(false);
  };

  const getVariantPrice = () => {
    let basePrice = item.sellingPrice;
    
    // Try to find matching variant
    if (item.variants && Object.keys(selectedAttributeValues).length > 0) {
      const matchingVariant = item.variants.find(v => {
        return Object.entries(selectedAttributeValues).every(([key, value]) => 
          v.attributes[key] === value
        );
      });
      if (matchingVariant) {
        basePrice = matchingVariant.price;
      }
    }

    return basePrice;
  };

  const currentBasePrice = getVariantPrice();
  const formattedPrice = (currentBasePrice * qty).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 text-primary">
            <Tag className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Configure Product
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Select variations for {item.name} to add to the cart.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Attribute Selection */}
          {attributes.map((attribute) => {
            const values = getAttributeValues(attribute);
            if (values.length === 0) return null;
            
            return (
              <div key={attribute} className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select {attribute}
                </span>
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => {
                    const isSelected = selectedAttributeValues[attribute] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedAttributeValues(prev => ({ ...prev, [attribute]: value }))}
                        className={cn(
                          "flex items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-tight transition-all duration-200 active:scale-95 min-w-[3rem] shadow-sm",
                          isSelected
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30 font-extrabold"
                            : "border-border bg-card text-foreground hover:bg-muted/50"
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between border-t border-dashed pt-4">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Quantity
            </span>
            <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-xl border">
              <Button
                id="variant-qty-decrease"
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-slate-600 hover:bg-white dark:hover:bg-zinc-800 shadow-sm"
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                {qty}
              </span>
              <Button
                id="variant-qty-increase"
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-slate-600 hover:bg-white dark:hover:bg-zinc-800 shadow-sm"
                onClick={() => setQty(qty + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            id="variant-add-to-cart"
            type="button"
            className="w-full h-11 text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            onClick={handleAdd}
          >
            Add to Cart — {NAIRA}{formattedPrice}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
