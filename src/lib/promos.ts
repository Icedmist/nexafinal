export interface PromoCode {
  id: string;
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  isActive: boolean;
  usageCount: number;
  maxUses: number | null;
}

const BUILT_IN_PROMOS: PromoCode[] = [
  { id: "promo-1", code: "WELCOME10", discountType: "percentage", discountValue: 10, isActive: true, usageCount: 0, maxUses: null },
  { id: "promo-2", code: "FLAT500", discountType: "flat", discountValue: 500, isActive: true, usageCount: 0, maxUses: 50 },
];

const STORAGE_KEY = "nexa_promo_usage";

function loadPromos(): PromoCode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return BUILT_IN_PROMOS.map((p) => ({ ...p }));
    const stored = JSON.parse(raw) as Record<string, number>;
    return BUILT_IN_PROMOS.map((p) => ({ ...p, usageCount: stored[p.code] ?? 0 }));
  } catch {
    return BUILT_IN_PROMOS.map((p) => ({ ...p }));
  }
}

function persistUsage(promos: PromoCode[]) {
  try {
    const usage: Record<string, number> = {};
    for (const p of promos) usage[p.code] = p.usageCount;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    /* ignore storage errors */
  }
}

export function validatePromo(code: string): PromoCode | null {
  const promo = loadPromos().find((p) => p.code.toUpperCase() === code.toUpperCase() && p.isActive);
  if (!promo) return null;
  if (promo.maxUses && promo.usageCount >= promo.maxUses) return null;
  return promo;
}

export function usePromo(code: string): void {
  const promos = loadPromos();
  const promo = promos.find((p) => p.code.toUpperCase() === code.toUpperCase());
  if (promo) {
    promo.usageCount++;
    persistUsage(promos);
  }
}
