export const COLOR_HEX_MAP: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  pink: "#ec4899",
  gray: "#6b7280",
  grey: "#6b7280",
  brown: "#78350f",
  beige: "#f5f5dc",
  navy: "#1e3a8a",
  teal: "#0d9488",
  gold: "#d4af37",
  silver: "#c0c0c0",
  cream: "#fffdd0",
  maroon: "#800000",
  olive: "#808000",
  coral: "#ff7f50",
  indigo: "#4b0082",
  turquoise: "#40e0d0",
  lavender: "#e6e6fa",
};

export const DEFAULT_COLOR_OPTIONS = [
  "Black", "White", "Red", "Blue", "Green", "Yellow",
  "Orange", "Purple", "Pink", "Navy", "Brown", "Beige",
  "Gold", "Silver", "Gray", "Cream", "Maroon", "Teal",
];

export const DEFAULT_SIZE_OPTIONS = [
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL",
];

export const DEFAULT_MATERIAL_OPTIONS = [
  "Cotton", "Polyester", "Silk", "Wool", "Linen", "Denim",
  "Leather", "Suede", "Nylon", "Rayon", "Velvet", "Chiffon",
];

export const VARIANT_ATTRIBUTES = ["Colour", "Size", "Material"] as const;

export type VariantAttribute = typeof VARIANT_ATTRIBUTES[number];

export function generateVariantId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getAttributeOptions(attribute: string): string[] {
  switch (attribute) {
    case "Colour": return DEFAULT_COLOR_OPTIONS;
    case "Size": return DEFAULT_SIZE_OPTIONS;
    case "Material": return DEFAULT_MATERIAL_OPTIONS;
    default: return [];
  }
}

export function getColorHex(colorName: string): string | null {
  return COLOR_HEX_MAP[colorName.toLowerCase()] || null;
}
