import type { Item } from "@/types/inventory";

export type SalePriceMode = "retail" | "wholesale";

export function getSalePriceMode(value?: string | null): SalePriceMode {
  return value === "wholesale" ? "wholesale" : "retail";
}

export function getSalePriceModeLabel(mode: SalePriceMode): string {
  return mode === "wholesale" ? "Wholesale" : "Retail";
}

export function buildCartKey(itemId: string, unitName: string, saleType: SalePriceMode = "retail", config?: string) {
  if (config) {
    return `${itemId}:${unitName}:${saleType}:${encodeURIComponent(config)}`;
  }
  return `${itemId}:${unitName}:${saleType}`;
}

export function parseCartKey(cartKey: string): { itemId: string; unitName: string; saleType: SalePriceMode; config?: string } {
  const [itemId = "", unitName = "", saleType, ...rest] = cartKey.split(":");
  let config: string | undefined;
  if (rest.length > 0) {
    try {
      config = decodeURIComponent(rest.join(":"));
    } catch {
      config = rest.join(":");
    }
  }
  return {
    itemId,
    unitName,
    saleType: getSalePriceMode(saleType),
    config,
  };
}

export interface ConfigPriceInfo {
  price: number;
  summary?: string;
  size?: { id: string; name: string; price: number };
  addons?: Array<{ id: string; name: string; price: number }>;
  spiceLevel?: string;
  note?: string;
  attributes?: Record<string, string>;
}

export function parseConfigString(configString?: string | null): ConfigPriceInfo | null {
  if (!configString) return null;
  try {
    const parsed = JSON.parse(configString);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ConfigPriceInfo;
  } catch {
    return null;
  }
}

export function getConfigPrice(item: Item, configString?: string | null): number {
  const config = parseConfigString(configString);
  if (!config) return getItemPriceForMode(item, item.unit, "retail");

  if (config.size) {
    const addonSum = (config.addons ?? []).reduce((s, a) => s + a.price, 0);
    return config.size.price + addonSum;
  }

  if (config.attributes && item.variants && item.variants.length > 0) {
    const matchingVariant = item.variants.find((v) =>
      Object.entries(config.attributes!).every(([key, value]) => v.attributes[key] === value)
    );
    if (matchingVariant) return matchingVariant.price;
  }

  return getItemPriceForMode(item, item.unit, "retail");
}

export function summarizeConfig(configString?: string | null): string | null {
  const config = parseConfigString(configString);
  if (!config) return null;
  const parts: string[] = [];
  if (config.size) parts.push(config.size.name);
  if (config.addons && config.addons.length > 0) {
    parts.push(config.addons.map((a) => a.name).join("+"));
  }
  if (config.attributes && Object.keys(config.attributes).length > 0) {
    parts.push(Object.values(config.attributes).join(" / "));
  }
  if (config.spiceLevel) parts.push(config.spiceLevel);
  if (config.note) parts.push(`"${config.note}"`);
  return parts.length > 0 ? parts.join(" · ") : null;
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
