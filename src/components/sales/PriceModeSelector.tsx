import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SalePriceMode } from "./price-utils";
import { cn } from "@/lib/utils";

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
      <Select value={value} onValueChange={(next) => onValueChange(next as SalePriceMode)}>
        <SelectTrigger className="h-8 rounded-full border-border/60 bg-background text-[11px] font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="retail">Retail</SelectItem>
          <SelectItem value="wholesale">Wholesale</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
