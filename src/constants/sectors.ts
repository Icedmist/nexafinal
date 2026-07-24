import { 
  Sprout, Pill, ChefHat, Factory, Smartphone, 
  ShoppingBag, Truck, LayoutDashboard, Utensils, 
  FlaskConical, HardHat, Cpu, Package, History,
  TrendingUp, Users, Settings, HelpCircle,
  FileText, ClipboardList, Store, LucideIcon
} from "lucide-react";

export enum BusinessType {
  Retail = "retail",
  Restaurant = "restaurant",
  Agriculture = "agriculture",
  Pharmacy = "pharmacy",
  Manufacturing = "manufacturing",
  Electronics = "electronics",
  SocialCommerce = "social_commerce",
  General = "general",
}

export interface SectorConfig {
  id: BusinessType;
  labels: {
    dashboard: string;
    catalog: string;
    inventory: string;
    sales: string;
    customers: string;
    suppliers: string;
    movements: string;
    reports: string;
    store: string;
    item: string;
    unit: string;
  };
  icons: {
    catalog: LucideIcon;
    item: LucideIcon;
  };
  features: {
    hasExpiry: boolean;
    hasBatches: boolean;
    hasTableBooking: boolean;
    hasProduction: boolean;
    hasWarranty: boolean;
    isFreshGood: boolean;
  };
  primaryAction: string;
}

export const SECTOR_CONFIGS: Record<string, SectorConfig> = {
  agriculture: {
    id: BusinessType.Agriculture,
    labels: {
      dashboard: "Farm Overview",
      catalog: "Crops & Produce",
      inventory: "Stockpiles",
      sales: "Harvest Sales",
      customers: "Buyers",
      suppliers: "Farm Supply",
      movements: "Stock Transfers",
      reports: "Yield Analytics",
      store: "Agro-Shop",
      item: "Crop/Product",
      unit: "Bag/Kg/Tonne",
    },
    icons: { catalog: Sprout, item: Sprout },
    features: { hasExpiry: true, hasBatches: true, hasTableBooking: false, hasProduction: false, hasWarranty: false, isFreshGood: true },
    primaryAction: "Record Harvest",
  },
  pharmacy: {
    id: BusinessType.Pharmacy,
    labels: {
      dashboard: "Pharmacy Hub",
      catalog: "Medications",
      inventory: "Drug Stores",
      sales: "Dispensing",
      customers: "Patients",
      suppliers: "Pharma Labs",
      movements: "Inventory Log",
      reports: "Compliance",
      store: "E-Pharmacy",
      item: "Medicine",
      unit: "Pack/Blister/Vial",
    },
    icons: { catalog: Pill, item: Pill },
    features: { hasExpiry: true, hasBatches: true, hasTableBooking: false, hasProduction: false, hasWarranty: false, isFreshGood: false },
    primaryAction: "Dispense Meds",
  },
  restaurant: {
    id: BusinessType.Restaurant,
    labels: {
      dashboard: "Kitchen Console",
      catalog: "Menu Items",
      inventory: "Ingredients",
      sales: "Table Orders",
      customers: "Diners",
      suppliers: "Wholesalers",
      movements: "Inventory Usage",
      reports: "Waste Analysis",
      store: "Online Menu",
      item: "Dish/Drink",
      unit: "Plate/Portion",
    },
    icons: { catalog: Utensils, item: Utensils },
    features: { hasExpiry: true, hasBatches: false, hasTableBooking: true, hasProduction: true, hasWarranty: false, isFreshGood: true },
    primaryAction: "New Order",
  },
  manufacturing: {
    id: BusinessType.Manufacturing,
    labels: {
      dashboard: "Plant Manager",
      catalog: "Product Line",
      inventory: "Raw Materials",
      sales: "Fulfillment",
      customers: "Distributors",
      suppliers: "Parts Vendors",
      movements: "Floor Sync",
      reports: "OEE Metrics",
      store: "Direct Sales",
      item: "Unit",
      unit: "Unit/Pcs",
    },
    icons: { catalog: Factory, item: HardHat },
    features: { hasExpiry: false, hasBatches: true, hasTableBooking: false, hasProduction: true, hasWarranty: true, isFreshGood: false },
    primaryAction: "Start Production",
  },
  social_commerce: {
    id: BusinessType.SocialCommerce,
    labels: {
      dashboard: "Vendor Hub",
      catalog: "Online Store",
      inventory: "Product Base",
      sales: "WA/FB Orders",
      customers: "Followers",
      suppliers: "Wholesalers",
      movements: "Stock Changes",
      reports: "Sale Analytics",
      store: "Public Link",
      item: "Listing",
      unit: "Unit",
    },
    icons: { catalog: Smartphone, item: ShoppingBag },
    features: { hasExpiry: false, hasBatches: false, hasTableBooking: false, hasProduction: false, hasWarranty: false, isFreshGood: false },
    primaryAction: "Create Listing",
  },
  electronics: {
    id: BusinessType.Electronics,
    labels: {
      dashboard: "Device Hub",
      catalog: "Devices & Tech",
      inventory: "Stockroom",
      sales: "Counter Sales",
      customers: "Buyers",
      suppliers: "Distributors",
      movements: "Stock Movement",
      reports: "Sales Analytics",
      store: "Gadget Store",
      item: "Device/Accessory",
      unit: "Pcs",
    },
    icons: { catalog: Smartphone, item: Smartphone },
    features: { hasExpiry: false, hasBatches: false, hasTableBooking: false, hasProduction: false, hasWarranty: true, isFreshGood: false },
    primaryAction: "Add Product",
  },
  general: {
    id: BusinessType.General,
    labels: {
      dashboard: "Dashboard",
      catalog: "Catalog",
      inventory: "Inventory",
      sales: "Sales",
      customers: "Customers",
      suppliers: "Suppliers",
      movements: "Movements",
      reports: "Analytics",
      store: "Storefront",
      item: "Product",
      unit: "Pcs",
    },
    icons: { catalog: ShoppingBag, item: Package },
    features: { hasExpiry: false, hasBatches: false, hasTableBooking: false, hasProduction: false, hasWarranty: false, isFreshGood: false },
    primaryAction: "Quick Sale",
  }
};

export const getSectorConfig = (type?: string): SectorConfig => {
  return SECTOR_CONFIGS[type || "general"] || SECTOR_CONFIGS.general;
};
