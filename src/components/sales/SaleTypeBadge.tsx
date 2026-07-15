import { Badge } from "@/components/ui/badge";
import type { SalePriceMode } from "./price-utils";
import { cn } from "@/lib/utils";

interface SaleTypeBadgeProps {
  mode: SalePriceMode | undefined;
  className?: string;
}

export function SaleTypeBadge({ mode, className }: SaleTypeBadgeProps) {
  if (!mode) return null;
  
  const isWholesale = mode === "wholesale";
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-black text-[10px] tracking-wider uppercase px-2 py-1",
        isWholesale
          ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
          : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
        className
      )}
    >
      {isWholesale ? "Wholesale" : "Retail"}
    </Badge>
  );
}
