import type { Category } from "@/types/inventory";

export interface BuiltInProduct {
  name: string;
  categoryName: string;
  defaultUnit: string;
  estimatedPrice?: number;
  emoji?: string;
}

export const CATEGORY_PRESETS: Record<string, { units: string[] }> = {
  electronics: { units: ["pcs", "pack", "box"] },
  fashion: { units: ["pcs", "pack", "pair"] },
  groceries: { units: ["pcs", "pack", "bottle", "bag", "kg", "g", "ltr", "ml"] },
  beauty: { units: ["pcs", "pack", "bottle"] },
  home: { units: ["pcs", "pack"] },
  sports: { units: ["pcs", "pack"] },
  proteins: { units: ["kg", "g", "portion", "plate", "bowl"] },
  grains: { units: ["kg", "g", "bag", "bowl", "cup", "mudu", "paint"] },
  vegetables: { units: ["pcs", "kg", "g", "portion", "plate", "bundle"] },
  drinks: { units: ["ltr", "ml", "bottle", "cup"] },
  spices: { units: ["g", "pack", "bottle", "cup"] },
  bakery: { units: ["pcs", "portion", "plate", "loaf", "pack"] },
  pills: { units: ["pcs", "pack", "strip", "box"] },
  syrups: { units: ["bottle", "ml"] },
  injections: { units: ["pcs", "vial", "pack"] },
  first_aid: { units: ["pcs", "pack", "roll"] },
  equipment: { units: ["pcs", "pack"] },
  disposables: { units: ["pcs", "pack", "box"] },
  cotton: { units: ["yard", "m", "roll"] },
  laces: { units: ["yard", "m"] },
  silk: { units: ["yard", "m"] },
  sewing: { units: ["pcs", "pack", "roll"] },
  traditional: { units: ["pcs", "yard"] },
  prints: { units: ["yard", "m", "pcs"] },
  fmcg: { units: ["carton", "box", "pack", "pcs"] },
  building: { units: ["pcs", "bag", "tonne", "m"] },
  agro: { units: ["bag", "kg", "pcs"] },
  industrial: { units: ["pcs", "pack", "box"] },
  textiles: { units: ["roll", "yard", "pcs"] },
  chemicals: { units: ["drum", "ltr", "bottle", "kg"] },
};

export function getBuiltInProductSuggestions(): BuiltInProduct[] {
  return [
    { name: "Coca-Cola 50cl", categoryName: "Drinks", defaultUnit: "bottle", estimatedPrice: 300, emoji: "Cup" },
    { name: "Indomie Noodles", categoryName: "Groceries", defaultUnit: "pack", estimatedPrice: 200, emoji: "Utensils" },
    { name: "Peak Milk 500g", categoryName: "Groceries", defaultUnit: "tin", estimatedPrice: 900, emoji: "Cup" },
    { name: "Dangote Sugar 1kg", categoryName: "Groceries", defaultUnit: "pack", estimatedPrice: 1100, emoji: "Package" },
    { name: "Pure Water Sachet", categoryName: "Drinks", defaultUnit: "bag", estimatedPrice: 300, emoji: "Cup" },
    { name: "Palm Oil 1L", categoryName: "Groceries", defaultUnit: "bottle", estimatedPrice: 2500, emoji: "FlaskConical" },
    { name: "Rice 50kg Bag", categoryName: "Grains", defaultUnit: "bag", estimatedPrice: 75000, emoji: "Utensils" },
    { name: "Chicken Wings 1kg", categoryName: "Proteins", defaultUnit: "kg", estimatedPrice: 3500, emoji: "Beef" },
    { name: "Garri 1kg", categoryName: "Grains", defaultUnit: "kg", estimatedPrice: 800, emoji: "Apple" },
    { name: "Tomato Paste", categoryName: "Groceries", defaultUnit: "tin", estimatedPrice: 500, emoji: "Flame" },
  ];
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

export function getCategorySupportedUnits(
  categoryLabel: string,
  categoryObj?: Category | null
): { id: string; label: string }[] {
  const key = categoryLabel.toLowerCase().replace(/[^a-z]/g, "");
  const preset = CATEGORY_PRESETS[key];
  if (preset) {
    return preset.units.map((u) => ({ id: u, label: u }));
  }
  return [
    { id: "pcs", label: "pcs" },
    { id: "pack", label: "pack" },
    { id: "box", label: "box" },
  ];
}

export function predictCategoryAndUnit(
  productName: string,
  categories: Category[]
): {
  matchedCategory: Category | null;
  suggestedCategoryName: string;
  suggestedUnit: string;
  confidence: "high" | "medium" | "low";
  builtInProduct?: BuiltInProduct;
} | null {
  if (!productName || productName.length < 2) return null;

  const q = productName.toLowerCase();
  const builtIns = getBuiltInProductSuggestions();

  for (const bi of builtIns) {
    if (q.includes(bi.name.toLowerCase()) || bi.name.toLowerCase().includes(q)) {
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase().includes(bi.categoryName.toLowerCase().split(" ")[0])
      );
      return {
        matchedCategory: matchedCat || null,
        suggestedCategoryName: bi.categoryName,
        suggestedUnit: bi.defaultUnit,
        confidence: "high",
        builtInProduct: bi,
      };
    }
  }

  for (const cat of categories) {
    const catName = cat.name.toLowerCase();
    if (q.includes(catName) || catName.includes(q.split(" ")[0])) {
      const units = getCategorySupportedUnits(cat.name, cat);
      return {
        matchedCategory: cat,
        suggestedCategoryName: cat.name,
        suggestedUnit: units[0]?.id || "pcs",
        confidence: "medium",
      };
    }
  }

  return null;
}
