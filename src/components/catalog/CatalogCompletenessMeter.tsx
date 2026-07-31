import React from "react";
import { CheckCircle2, AlertCircle, Sparkles, Image, DollarSign, Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export interface ItemForCompleteness {
  id: string;
  name?: string;
  imageUrl?: string;
  image?: string;
  price?: number;
  costPrice?: number;
  sellingPrice?: number;
  unitPrice?: number;
  quantity?: number;
  stock?: number;
  currentStock?: number;
}

interface CatalogCompletenessMeterProps {
  items: ItemForCompleteness[];
  onQuickActionClick?: () => void;
}

export function CatalogCompletenessMeter({ items, onQuickActionClick }: CatalogCompletenessMeterProps) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Catalog Quality Index</span>
          </span>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            0 Products
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Add your first products with prices and stock to calculate your store's completeness score.</p>
      </div>
    );
  }

  // Calculate completeness
  let completeCount = 0;
  let missingImageCount = 0;
  let missingPriceCount = 0;
  let missingStockCount = 0;

  items.forEach((item) => {
    const hasImage = Boolean(item.imageUrl?.trim() || item.image?.trim());
    const priceVal = item.sellingPrice ?? item.price ?? item.unitPrice ?? 0;
    const hasPrice = priceVal > 0;
    const stockVal = item.quantity ?? item.stock ?? item.currentStock ?? -1;
    const hasStock = stockVal >= 0;

    if (!hasImage) missingImageCount++;
    if (!hasPrice) missingPriceCount++;
    if (!hasStock) missingStockCount++;

    if (hasImage && hasPrice && hasStock) {
      completeCount++;
    }
  });

  const total = items.length;
  const percentage = Math.round((completeCount / total) * 100);
  const incompleteCount = total - completeCount;

  // Build actionable suggestion
  let actionableText = "";
  if (percentage === 100) {
    actionableText = "All products are fully set up with high quality photos, prices, and stock levels!";
  } else {
    const issues: string[] = [];
    if (missingImageCount > 0) issues.push(`images (${missingImageCount})`);
    if (missingPriceCount > 0) issues.push(`prices (${missingPriceCount})`);
    if (missingStockCount > 0) issues.push(`stock levels (${missingStockCount})`);

    actionableText = `Complete ${incompleteCount} more product${incompleteCount > 1 ? "s" : ""} to reach 100% (${issues.join(", ")})`;
  }

  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xs p-3.5 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
            {percentage}%
          </div>
          <div>
            <h4 className="font-bold text-foreground text-xs leading-none flex items-center gap-1.5">
              <span>Catalog Quality Index</span>
              {percentage === 100 ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              )}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {completeCount} of {total} products complete
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`text-[10px] font-semibold px-2 py-0.5 ${
            percentage >= 80
              ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
              : percentage >= 50
              ? "border-amber-500/30 text-amber-600 bg-amber-500/5"
              : "border-blue-500/30 text-blue-600 bg-blue-500/5"
          }`}
        >
          {percentage >= 80 ? "High Quality" : percentage >= 50 ? "Good" : "Needs Detail"}
        </Badge>
      </div>

      <Progress value={percentage} className="h-2 bg-muted rounded-full" />

      <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
        <p className="text-muted-foreground font-medium flex items-center gap-1.5 truncate">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="truncate">{actionableText}</span>
        </p>

        {percentage < 100 && onQuickActionClick && (
          <button
            type="button"
            onClick={onQuickActionClick}
            className="text-[11px] font-bold text-primary hover:underline shrink-0"
          >
            Update Catalog &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
