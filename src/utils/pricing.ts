import type { PricingTiers } from "@/types/inventory";

/**
 * Resolves the price of a product based on the store's pricing mode and customer type.
 * Composes with any downstream discounts by resolving the correct base price.
 */
export function resolvePrice(
  product: { sellingPrice: number; pricingTiers?: PricingTiers },
  pricingMode?: "single" | "tiered",
  customerType: "retail" | "wholesale" | "distributor" = "retail"
): number {
  if (!pricingMode || pricingMode === "single" || !product.pricingTiers || !product.pricingTiers.tierEnabled) {
    return product.sellingPrice;
  }

  const { retail, wholesale, distributor } = product.pricingTiers;

  switch (customerType) {
    case "distributor":
      if (distributor !== undefined && distributor !== null && !isNaN(distributor) && distributor > 0) {
        return distributor;
      }
      if (wholesale !== undefined && wholesale !== null && !isNaN(wholesale) && wholesale > 0) {
        return wholesale;
      }
      if (retail !== undefined && retail !== null && !isNaN(retail) && retail > 0) {
        return retail;
      }
      return product.sellingPrice;

    case "wholesale":
      if (wholesale !== undefined && wholesale !== null && !isNaN(wholesale) && wholesale > 0) {
        return wholesale;
      }
      if (retail !== undefined && retail !== null && !isNaN(retail) && retail > 0) {
        return retail;
      }
      return product.sellingPrice;

    case "retail":
    default:
      if (retail !== undefined && retail !== null && !isNaN(retail) && retail > 0) {
        return retail;
      }
      return product.sellingPrice;
  }
}
