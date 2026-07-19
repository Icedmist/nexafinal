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
    <div className={cn("space-y-1", className)}>
      {label && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>}
      <div className="flex h-8 rounded-full border border-border/60 bg-muted/30 p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => onValueChange("retail")}
          className={cn(
            "flex-1 rounded-full text-[11px] font-semibold transition-all duration-200 px-3",
            value === "retail"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Retail
        </button>
        <button
          type="button"
          onClick={() => onValueChange("wholesale")}
          className={cn(
            "flex-1 rounded-full text-[11px] font-semibold transition-all duration-200 px-3",
            value === "wholesale"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Wholesale
        </button>
      </div>
    </div>
  );
}
