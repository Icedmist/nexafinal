import { Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Item, Category } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface CatalogGridProps {
  items: Item[];
  categories: Category[];
  onRowClick: (item: Item) => void;
  actionRenderer: (item: Item) => React.ReactNode;
  selected?: Set<string>;
  onSelectedChange?: (s: Set<string>) => void;
  showCheckboxes?: boolean;
}

export function CatalogGrid({ 
  items, 
  categories, 
  onRowClick, 
  actionRenderer,
  selected,
  onSelectedChange,
  showCheckboxes = false
}: CatalogGridProps) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const stockStatus = (item: Item) => {
    if (item.currentStock === 0) return { label: "Out of Stock", color: "bg-destructive/10 text-destructive border-destructive/20" };
    if (item.currentStock <= item.reorderPoint) return { label: "Low Stock", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    return { label: "In Stock", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  };

  const allSelected = items.length > 0 && items.every((i) => selected?.has(i.id));

  return (
    <div className="space-y-4">
      {showCheckboxes && selected && onSelectedChange && (
        <div className="flex items-center gap-2 bg-muted/40 border border-border/85 px-4 py-3 rounded-2xl text-xs">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => {
              if (v) onSelectedChange(new Set(items.map((i) => i.id)));
              else onSelectedChange(new Set());
            }}
          />
          <span className="font-bold text-muted-foreground">Select All Current Grid ({items.length})</span>
          {selected.size > 0 && (
            <span className="ml-auto font-bold text-primary">{selected.size} marked</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const status = stockStatus(item);
          const isSelected = selected?.has(item.id) ?? false;
          return (
            <Card 
              key={item.id} 
              className={cn(
                "group relative flex flex-col overflow-hidden border-border transition-all hover:border-primary/50 hover:shadow-md cursor-pointer",
                isSelected ? "border-primary bg-primary/5" : ""
              )}
              onClick={() => onRowClick(item)}
            >
              <div className="aspect-[4/3] w-full bg-muted/30 flex items-center justify-center border-b border-border relative">
                {showCheckboxes && selected && onSelectedChange && (
                  <div 
                    className="absolute top-2 left-2 z-15 bg-white dark:bg-neutral-900 p-1 rounded-md shadow-sm border border-border/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v) {
                          next.add(item.id);
                        } else {
                          next.delete(item.id);
                        }
                        onSelectedChange(next);
                      }}
                    />
                  </div>
                )}

                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {actionRenderer(item)}
                </div>
              </div>
              
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold line-clamp-1 text-foreground leading-none">
                    {item.name}
                  </h3>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">
                  {item.sku}
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className={cn("text-[10px] uppercase font-bold py-0 h-5", status.color)}>
                    {status.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]">
                    {catMap.get(item.categoryId ?? "") ?? "Uncategorized"}
                  </span>
                </div>

                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5 leading-none">Price</p>
                    <p className="text-sm font-bold font-mono">₦{item.sellingPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5 leading-none">Stock</p>
                    <p className="text-sm font-bold font-mono">
                      {item.currentStock}
                      <span className="ml-0.5 text-[9px] uppercase font-medium">{item.unit !== "pcs" ? item.unit : ""}</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
