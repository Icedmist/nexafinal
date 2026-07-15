import type { Item } from "@/types/inventory";

export type SalePriceMode = "retail" | "wholesale";

export function getSalePriceMode(value?: string | null): SalePriceMode {
  return value === "wholesale" ? "wholesale" : "retail";
}

export function getSalePriceModeLabel(mode: SalePriceMode): string {
  return mode === "wholesale" ? "Wholesale" : "Retail";
}

export function buildCartKey(itemId: string, unitName: string, saleType: SalePriceMode = "retail") {
  return `${itemId}:${unitName}:${saleType}`;
}

export function parseCartKey(cartKey: string): { itemId: string; unitName: string; saleType: SalePriceMode } {
  const [itemId = "", unitName = "", saleType] = cartKey.split(":");
  return {
    itemId,
    unitName,
    saleType: getSalePriceMode(saleType),
  };
}

export function getItemPriceForMode(item: Item, unitName: string, saleType: SalePriceMode = "retail"): number {
  const basePrice = saleType === "wholesale"
    ? (item.wholesalePrice ?? item.sellingPrice)
    : item.sellingPrice;

  if (unitName === item.unit) {
    return basePrice;
  }

  // Check if unitName is actually a variant ID
  if (item.variants && item.variants.length > 0) {
    const variant = item.variants.find(v => v.id === unitName);
    if (variant) {
      // Variants currently only have a single price field.
      // If wholesale is needed for variants, we can adapt, but for now return variant.price
      return variant.price;
    }
  }

  const secondaryUnit = item.units?.find((u) => u.name === unitName);
  if (secondaryUnit) {
    return secondaryUnit.sellingPrice ?? (basePrice * secondaryUnit.conversionFactor);
  }

  return basePrice;
}
