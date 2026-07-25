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
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value as SalePriceMode)}
        className={cn(
          "h-9 w-full rounded-full px-4 text-[12px] font-bold cursor-pointer outline-none border transition-all duration-200",
          value === "wholesale"
            ? "bg-amber-600 text-white border-amber-700 shadow-md shadow-amber-600/20"
            : "bg-background text-foreground border-border/60 shadow-sm"
        )}
      >
        <option value="retail">Retail Price</option>
        <option value="wholesale">Wholesale Price</option>
      </select>
    </div>
  );
}
