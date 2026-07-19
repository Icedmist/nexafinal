import { cn } from "@/lib/utils";
import type { SalePriceMode } from "./price-utils";

interface PriceModeSelectorProps {
  value: SalePriceMode;
  onValueChange: (value: SalePriceMode) => void;
  className?: string;
  label?: string;
}

export function PriceModeSelector({ value, onValueChange, className, label }: PriceModeSelectorProps) {
  return (
    <div className={cn("space-y-1", className)} onClick={(e) => e.stopPropagation()}>
      {label && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>}
      <div className="flex h-8 rounded-full border border-border/60 bg-muted/30 p-0.5 gap-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onValueChange("retail");
          }}
          className={cn(
            "flex-1 rounded-full text-[11px] font-semibold transition-all duration-200 px-3 cursor-pointer select-none",
            value === "retail"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Retail
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onValueChange("wholesale");
          }}
          className={cn(
            "flex-1 rounded-full text-[11px] font-semibold transition-all duration-200 px-3 cursor-pointer select-none",
            value === "wholesale"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Wholesale
        </button>
      </div>
    </div>
  );
}
