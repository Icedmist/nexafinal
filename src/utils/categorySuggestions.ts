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

export interface DistributorPreset {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  state: string;
  minOrderValueNgn: number;
  deliveryLeadDays: number;
  verified: boolean;
  brands: string[];
}

export const DISTRIBUTOR_PRESETS: DistributorPreset[] = [
  {
    id: "dist-nb",
    name: "Nigerian Breweries Plc Depot",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Chidi Opara (Sales Mgr)",
    contactPhone: "+234 803 111 2233",
    contactEmail: "orders@nbplc.com",
    state: "Lagos",
    minOrderValueNgn: 150000,
    deliveryLeadDays: 1,
    verified: true,
    brands: ["Heineken", "Goldberg", "Star Radler", "Maltina", "Amstel Malta", "Fayrouz", "Legend"]
  },
  {
    id: "dist-nbc",
    name: "Nigerian Bottling Company (Coca-Cola NBC)",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Bisi Adebayo (Distribution Lead)",
    contactPhone: "+234 802 999 8877",
    contactEmail: "supply@cchellenic-nbc.com",
    state: "Lagos",
    minOrderValueNgn: 100000,
    deliveryLeadDays: 1,
    verified: true,
    brands: ["Coca-Cola", "Fanta", "Sprite", "Eva Water", "Monster Energy", "Schweppes", "Limca"]
  },
  {
    id: "dist-7up",
    name: "Seven-Up Bottling Company (SBC)",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Tunde Ednut (Key Accounts)",
    contactPhone: "+234 805 444 3322",
    contactEmail: "orders@sevenup.org",
    state: "Lagos",
    minOrderValueNgn: 80000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["7Up", "Pepsi", "Mirinda", "Aquafina Water", "Teem", "Lipton Ice Tea", "Rockstar"]
  },
  {
    id: "dist-guinness",
    name: "Guinness Nigeria Wholesale Depot",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Emeka Ike (Wholesale Officer)",
    contactPhone: "+234 809 222 1100",
    contactEmail: "direct@guinness.com",
    state: "Lagos",
    minOrderValueNgn: 200000,
    deliveryLeadDays: 1,
    verified: true,
    brands: ["Guinness Stout", "Malta Guinness", "Orijin", "Smirnoff", "Johnnie Walker", "Baileys"]
  },
  {
    id: "dist-chi",
    name: "Chi Limited / CCBA Distribution Hub",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Fatima Alhassan (FMCG Mgr)",
    contactPhone: "+234 806 777 5544",
    contactEmail: "sales@chiltd.com",
    state: "Ogun",
    minOrderValueNgn: 120000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Chivita 100%", "Chi Exotic", "Hollandia Yoghurt", "Capri-Sun", "SuperBite"]
  },
  {
    id: "dist-rite",
    name: "Rite Foods Depot (Bigi)",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Sola Bakare",
    contactPhone: "+234 811 333 4455",
    contactEmail: "orders@ritefoodsltd.com",
    state: "Ogun",
    minOrderValueNgn: 90000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Bigi Cola", "Bigi Apple", "Bigi Orange", "Fearless Energy", "Bigi Water"]
  },
  {
    id: "dist-maybaker",
    name: "May & Baker Nigeria Plc",
    category: "pharmacy",
    categoryName: "Pharmaceuticals & Medicines",
    contactPerson: "Dr. Kemi Lawson (Pharma Lead)",
    contactPhone: "+234 803 888 7766",
    contactEmail: "orders@may-baker.com",
    state: "Lagos",
    minOrderValueNgn: 150000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Paracetamol", "M&B Cough Syrup", "Antimalarials", "Antibiotics"]
  },
  {
    id: "dist-fidson",
    name: "Fidson Healthcare Plc Hub",
    category: "pharmacy",
    categoryName: "Pharmaceuticals & Medicines",
    contactPerson: "Pharm. Austin Chukwu",
    contactPhone: "+234 802 555 6677",
    contactEmail: "supply@fidson.com",
    state: "Lagos",
    minOrderValueNgn: 200000,
    deliveryLeadDays: 1,
    verified: true,
    brands: ["Astyfer", "Ciprotab", "Triple Action Cream", "Trikacide"]
  },
  {
    id: "dist-friesland",
    name: "FrieslandCampina WAMCO Nigeria",
    category: "groceries",
    categoryName: "Groceries & FMCG",
    contactPerson: "Mrs. Nkechi Nwosu",
    contactPhone: "+234 805 123 4567",
    contactEmail: "orders@frieslandcampina.com",
    state: "Lagos",
    minOrderValueNgn: 250000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Peak Milk", "Three Crowns Milk", "Friso Gold"]
  },
  {
    id: "dist-fmn",
    name: "Flour Mills of Nigeria (Golden Penny)",
    category: "groceries",
    categoryName: "Groceries & FMCG",
    contactPerson: "Alhaji Ibrahim Danjuma",
    contactPhone: "+234 807 987 6543",
    contactEmail: "sales@fmnplc.com",
    state: "Lagos",
    minOrderValueNgn: 300000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Golden Penny Rice", "Golden Penny Flour", "Golden Penny Sugar", "Golden Penny Noodles", "Semovita"]
  }
];

export function getCategoryDistributors(categoryNameOrId?: string): DistributorPreset[] {
  if (!categoryNameOrId || categoryNameOrId === "all") {
    return DISTRIBUTOR_PRESETS;
  }

  const query = categoryNameOrId.toLowerCase();
  return DISTRIBUTOR_PRESETS.filter(
    (d) =>
      d.category === query ||
      d.categoryName.toLowerCase().includes(query) ||
      query.includes(d.category)
  );
}
