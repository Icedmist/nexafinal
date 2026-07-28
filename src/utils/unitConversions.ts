import type { Item, UnitConversion } from "@/types/inventory";

/**
 * Returns all unit conversions for an item.
 * If explicitly defined in item.unitConversions, returns those.
 * Otherwise, if the item is measured in a bulk unit (e.g. bag, carton, crate, box, pack, roll, bundle, paint, mudu),
 * infers standard small unit conversions so sellers can see and select multi-variants / small units seamlessly.
 */
export function getEffectiveUnitConversions(item: Item): UnitConversion[] {
  if (item.unitConversions && item.unitConversions.length > 0) {
    return item.unitConversions;
  }

  const unit = (item.unit || "").toLowerCase().trim();
  const basePriceNgn = item.sellingPrice;

  if (unit === "bag") {
    return [
      { unitId: "kg", multiplier: 0.02, priceNgn: Math.round(basePriceNgn * 0.022) },
      { unitId: "mudu", multiplier: 0.04, priceNgn: Math.round(basePriceNgn * 0.045) },
      { unitId: "paint", multiplier: 0.08, priceNgn: Math.round(basePriceNgn * 0.09) }
    ];
  }

  if (unit === "carton") {
    return [
      { unitId: "pcs", multiplier: Number((1 / 24).toFixed(4)), priceNgn: Math.round((basePriceNgn / 24) * 1.1) },
      { unitId: "pack", multiplier: Number((1 / 4).toFixed(4)), priceNgn: Math.round((basePriceNgn / 4) * 1.05) }
    ];
  }

  if (unit === "crate") {
    return [
      { unitId: "pcs", multiplier: Number((1 / 30).toFixed(4)), priceNgn: Math.round((basePriceNgn / 30) * 1.1) },
      { unitId: "half-crate", multiplier: 0.5, priceNgn: Math.round(basePriceNgn * 0.52) }
    ];
  }

  if (unit === "box") {
    return [
      { unitId: "pcs", multiplier: Number((1 / 12).toFixed(4)), priceNgn: Math.round((basePriceNgn / 12) * 1.1) },
      { unitId: "pack", multiplier: Number((1 / 2).toFixed(4)), priceNgn: Math.round(basePriceNgn * 0.52) }
    ];
  }

  if (unit === "pack") {
    return [
      { unitId: "pcs", multiplier: Number((1 / 10).toFixed(4)), priceNgn: Math.round((basePriceNgn / 10) * 1.1) }
    ];
  }

  if (unit === "roll") {
    return [
      { unitId: "yard", multiplier: 0.01, priceNgn: Math.round((basePriceNgn / 100) * 1.1) },
      { unitId: "meter", multiplier: 0.011, priceNgn: Math.round((basePriceNgn / 90) * 1.1) }
    ];
  }

  if (unit === "bundle") {
    return [
      { unitId: "pcs", multiplier: 0.1, priceNgn: Math.round((basePriceNgn / 10) * 1.1) }
    ];
  }

  if (unit === "paint" || unit === "bucket") {
    return [
      { unitId: "kg", multiplier: 0.25, priceNgn: Math.round((basePriceNgn / 4) * 1.1) },
      { unitId: "mudu", multiplier: 0.5, priceNgn: Math.round((basePriceNgn / 2) * 1.08) }
    ];
  }

  return [];
}

/**
 * Helper to check if an item has bulk or multi-unit conversions or multi-variant options.
 */
export function hasMultiUnitOrVariants(item: Item): boolean {
  const conversions = getEffectiveUnitConversions(item);
  if (conversions.length > 0) return true;
  if (item.color || item.sizes) return true;
  if (item.fineTunedVariants && Object.keys(item.fineTunedVariants).length > 0) return true;
  return false;
}
