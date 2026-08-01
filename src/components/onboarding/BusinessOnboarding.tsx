import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  UtensilsCrossed,
  Warehouse,
  Package,
  Sprout,
  Smartphone,
  Scissors,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Plus,
  Pill,
  Factory,
  Scan,
  ClipboardPen,
  Rocket,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BulkProductEntry, type PendingProduct } from "./BulkProductEntry";
import { getLucideIcon } from "@/utils/lucideIconMap";

const BUSINESS_TYPES = [
  { id: "retail", label: "Retail / POS", icon: Store, description: "Physical store selling to customers" },
  { id: "electronics", label: "Phones & Accessories", icon: Smartphone, description: "Mobile devices, tablets & accessories" },
  { id: "restaurant", label: "Restaurant / Food", icon: UtensilsCrossed, description: "Food service with menu items" },
  { id: "agriculture", label: "Agriculture", icon: Sprout, description: "Farm products, grains, and livestock" },
  { id: "social_commerce", label: "Online Vendor", icon: Smartphone, description: "Sell on WhatsApp and Facebook" },
  { id: "pharmacy", label: "Pharmacy / Health", icon: Pill, description: "Medicines, medical supplies & prescriptions" },
  { id: "manufacturing", label: "Manufacturing", icon: Factory, description: "Production lines and raw materials" },
  { id: "textile", label: "Textiles / Fashion", icon: Scissors, description: "Fabrics, yards, and materials" },
  { id: "boutique", label: "Boutique / Clothing", icon: Scissors, description: "Clothing, shoes, and accessories" },
  { id: "wholesale", label: "Wholesale", icon: Warehouse, description: "Bulk sales to other businesses" },
  { id: "general", label: "General Inventory", icon: Package, description: "Flexible for any business" },
] as const;

const CATEGORY_MAP: Record<string, { id: string; label: string; emoji: string; supportedUnits?: string[] }[]> = {
  retail: [
    { id: "electronics", label: "Electronics", emoji: "Smartphone", supportedUnits: ["pcs", "pack", "box"] },
    { id: "fashion", label: "Fashion & Clothing", emoji: "Shirt", supportedUnits: ["pcs", "pack", "pair"] },
    { id: "groceries", label: "Groceries", emoji: "ShoppingCart", supportedUnits: ["pcs", "pack", "bottle", "bag", "kg", "g", "ltr", "ml"] },
    { id: "beauty", label: "Beauty & Health", emoji: "Palette", supportedUnits: ["pcs", "pack", "bottle"] },
    { id: "home", label: "Home & Living", emoji: "Home", supportedUnits: ["pcs", "pack"] },
    { id: "sports", label: "Sports & Fitness", emoji: "Circle", supportedUnits: ["pcs", "pack"] },
  ],
  boutique: [
    { id: "shoes", label: "Shoes", emoji: "Footprints", supportedUnits: ["pcs", "pair"] },
    { id: "tops", label: "Tops", emoji: "Shirt", supportedUnits: ["pcs", "pack"] },
    { id: "bottoms", label: "Bottoms", emoji: "Shirt", supportedUnits: ["pcs", "pack"] },
    { id: "dresses", label: "Dresses", emoji: "Shirt", supportedUnits: ["pcs"] },
    { id: "accessories", label: "Accessories", emoji: "ShoppingBag", supportedUnits: ["pcs", "pack"] },
  ],
  electronics: [
    { id: "devices", label: "Devices (Phones/Tablets)", emoji: "Smartphone", supportedUnits: ["pcs"] },
    { id: "accessories", label: "Accessories", emoji: "Plug", supportedUnits: ["pcs", "pack"] },
    { id: "cases", label: "Cases & Covers", emoji: "Shield", supportedUnits: ["pcs"] },
    { id: "chargers", label: "Chargers & Cables", emoji: "Zap", supportedUnits: ["pcs", "pack"] },
    { id: "audio", label: "Earphones & Audio", emoji: "Headphones", supportedUnits: ["pcs"] },
    { id: "protection", label: "Screen Protectors", emoji: "Gem", supportedUnits: ["pcs"] },
    { id: "powerbanks", label: "Power Banks", emoji: "Battery", supportedUnits: ["pcs"] },
    { id: "repairs", label: "Repair Parts", emoji: "Wrench", supportedUnits: ["pcs", "pack"] },
  ],
  restaurant: [
    { id: "proteins", label: "Proteins & Meat", emoji: "Beef", supportedUnits: ["kg", "g", "portion", "plate", "bowl"] },
    { id: "grains", label: "Grains & Staples", emoji: "Utensils", supportedUnits: ["kg", "g", "bag", "bowl", "cup", "mudu", "paint"] },
    { id: "vegetables", label: "Vegetables & Fruits", emoji: "Leaf", supportedUnits: ["pcs", "kg", "g", "portion", "plate", "bowl", "bundle"] },
    { id: "drinks", label: "Drinks & Beverages", emoji: "Cup", supportedUnits: ["ltr", "ml", "bottle", "cup"] },
    { id: "spices", label: "Spices & Seasonings", emoji: "Flame", supportedUnits: ["g", "pack", "bottle", "cup"] },
    { id: "bakery", label: "Bakery & Pastry", emoji: "Cake", supportedUnits: ["pcs", "portion", "plate", "loaf", "pack"] },
  ],
  pharmacy: [
    { id: "pills", label: "Tablets & Capsules", emoji: "Pill", supportedUnits: ["pcs", "pack", "strip", "box"] },
    { id: "syrups", label: "Syrups & Liquids", emoji: "FlaskConical", supportedUnits: ["bottle", "ml"] },
    { id: "injections", label: "Injections & IVs", emoji: "Syringe", supportedUnits: ["pcs", "vial", "pack"] },
    { id: "first_aid", label: "First Aid & Creams", emoji: "Bandage", supportedUnits: ["pcs", "pack", "roll"] },
    { id: "equipment", label: "Medical Equipment", emoji: "Stethoscope", supportedUnits: ["pcs", "pack"] },
    { id: "disposables", label: "Disposables", emoji: "Hand", supportedUnits: ["pcs", "pack", "box"] },
  ],
  manufacturing: [
    { id: "raw_materials", label: "Raw Materials", emoji: "Box", supportedUnits: ["kg", "g", "ltr", "ml", "bag", "drum"] },
    { id: "components", label: "Components & Parts", emoji: "Settings", supportedUnits: ["pcs", "pack", "box"] },
    { id: "work_in_progress", label: "Work-in-Progress", emoji: "Construction", supportedUnits: ["pcs"] },
    { id: "finished_goods", label: "Finished Products", emoji: "Package", supportedUnits: ["pcs", "pack", "box"] },
    { id: "packaging", label: "Packaging Supplies", emoji: "Tag", supportedUnits: ["pcs", "roll", "pack"] },
    { id: "tools_mfg", label: "Factory Tools", emoji: "Wrench", supportedUnits: ["pcs", "pack"] },
  ],
  agriculture: [
    { id: "grains_bulk", label: "Grains (Bags)", emoji: "Wheat", supportedUnits: ["bag", "kg", "mudu", "paint"] },
    { id: "tubers", label: "Tubers & Starch", emoji: "Apple", supportedUnits: ["pcs", "kg", "bundle"] },
    { id: "livestock", label: "Livestock & Poultry", emoji: "Bird", supportedUnits: ["pcs", "kg"] },
    { id: "seeds", label: "Seeds & Saplings", emoji: "Sprout", supportedUnits: ["pcs", "kg", "g", "pack", "bag", "bundle"] },
    { id: "fertilizers", label: "Fertilizers & Chemicals", emoji: "FlaskConical", supportedUnits: ["pcs", "kg", "g", "ltr", "ml", "bag", "bottle"] },
    { id: "tools_agri", label: "Agricultural Tools", emoji: "Tractor", supportedUnits: ["pcs", "pack"] },
  ],
  social_commerce: [
    { id: "electronics_online", label: "Gadgets & Tech", emoji: "Headphones", supportedUnits: ["pcs"] },
    { id: "fashion_online", label: "Fashion & Shoes", emoji: "Footprints", supportedUnits: ["pcs", "pair"] },
    { id: "cosmetics_online", label: "Beauty & Skin", emoji: "Palette", supportedUnits: ["pcs", "bottle"] },
    { id: "household_online", label: "Home Essentials", emoji: "Package", supportedUnits: ["pcs"] },
    { id: "services_online", label: "Digital Services", emoji: "Zap", supportedUnits: ["pcs"] },
    { id: "custom_online", label: "Custom Crafts", emoji: "Palette", supportedUnits: ["pcs"] },
  ],
  textile: [
    { id: "cotton", label: "Cotton & Linens", emoji: "Scissors", supportedUnits: ["yard", "m", "roll"] },
    { id: "laces", label: "Laces & Embroidery", emoji: "Shirt", supportedUnits: ["yard", "m"] },
    { id: "silk", label: "Silk & Luxury", emoji: "Sparkles", supportedUnits: ["yard", "m"] },
    { id: "sewing", label: "Sewing Essentials", emoji: "Scissors", supportedUnits: ["pcs", "pack", "roll"] },
    { id: "traditional", label: "Traditional Attire", emoji: "Shirt", supportedUnits: ["pcs", "yard"] },
    { id: "prints", label: "African Prints (Ankara)", emoji: "Palette", supportedUnits: ["yard", "m", "pcs"] },
  ],
  wholesale: [
    { id: "fmcg", label: "FMCG", emoji: "Package", supportedUnits: ["carton", "box", "pack", "pcs"] },
    { id: "building", label: "Building Materials", emoji: "Box", supportedUnits: ["pcs", "bag", "tonne", "m"] },
    { id: "agro", label: "Agro & Farm", emoji: "Wheat", supportedUnits: ["bag", "kg", "pcs"] },
    { id: "industrial", label: "Industrial Supplies", emoji: "Settings", supportedUnits: ["pcs", "pack", "box"] },
    { id: "textiles", label: "Textiles", emoji: "Scissors", supportedUnits: ["roll", "yard", "pcs"] },
    { id: "chemicals", label: "Chemicals", emoji: "FlaskConical", supportedUnits: ["drum", "ltr", "bottle", "kg"] },
  ],
  general: [
    { id: "office", label: "Office Supplies", emoji: "Paperclip", supportedUnits: ["pcs", "pack", "box"] },
    { id: "tools", label: "Tools & Hardware", emoji: "Wrench", supportedUnits: ["pcs", "pack", "box"] },
    { id: "it", label: "IT & Equipment", emoji: "Laptop", supportedUnits: ["pcs", "pack", "box"] },
    { id: "medical", label: "Medical Supplies", emoji: "Hospital", supportedUnits: ["pcs", "pack", "box", "vial"] },
    { id: "cleaning", label: "Cleaning Products", emoji: "Eraser", supportedUnits: ["pcs", "pack", "bottle", "ltr", "ml"] },
    { id: "misc", label: "Miscellaneous", emoji: "ClipboardList", supportedUnits: ["pcs"] },
  ],
};

const BRAND_COLORS = [
  { id: "teal", value: "#0d9488", label: "Teal" },
  { id: "blue", value: "#2563eb", label: "Blue" },
  { id: "indigo", value: "#4f46e5", label: "Indigo" },
  { id: "purple", value: "#7c3aed", label: "Purple" },
  { id: "orange", value: "#ea580c", label: "Orange" },
  { id: "pink", value: "#db2777", label: "Pink" },
];

const ENTRY_METHODS = [
  {
    id: "camera",
    title: "Scan products with your camera",
    subtitle: "Best for supermarkets, pharmacies — ~5-15 sec/item",
    description: "Scan barcodes on packaged goods — we'll auto-fill name, category & image where recognised. You just confirm price & stock.",
    icon: Scan,
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20"
  },
  {
    id: "manual",
    title: "Add a few products manually",
    subtitle: "Best for boutiques, small shops — <20 items",
    description: "The bulk entry grid — type in your top products now, one row each.",
    icon: ClipboardPen,
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
  },
  {
    id: "skip",
    title: "Skip — build it as I sell",
    subtitle: "Best for busy supermarkets — start selling now",
    description: "Launch now with an empty catalog. Use Add-on-Sell at checkout — every new scan during a real sale adds the item automatically.",
    icon: Rocket,
    badgeColor: "bg-violet-500/10 text-violet-500 border-violet-500/20"
  },
  {
    id: "excel",
    title: "Import from a spreadsheet",
    subtitle: "Best if you have an existing product list",
    description: "Upload a CSV/Excel file — even messy ones. We'll match columns automatically.",
    icon: FileSpreadsheet,
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  }
];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
  "Taraba", "Yobe", "Zamfara"
];

interface BusinessOnboardingProps {
  onComplete: (data: {
    businessType: string;
    categories: string[];
    storeName: string;
    brandColor: string;
    moniepointKey?: string;
    storeSlug?: string;
    paystackPublicKey?: string;
    paystackSecretKey?: string;
    paystackAccountNumber?: string;
    paystackAccountName?: string;
    paystackBankName?: string;
    electronicsMainType?: "devices" | "accessories" | "both";
    textilePrimarilySellsBy?: "yard" | "roll" | "both";
    textileSubcategories?: { id: string; label: string; emoji: string; supportedUnits?: string[] }[];
    boutiqueSubcategories?: { id: string; label: string; emoji: string; supportedUnits?: string[] }[];
    initialItems?: PendingProduct[];
    country?: string;
    state?: string;
    lga?: string;
    selectedPlan?: "starter" | "professional" | "enterprise";
    entryMethod?: "camera" | "manual" | "skip" | "excel";
  }) => void;
  onSkip: () => void;
}

export function BusinessOnboarding({ onComplete, onSkip }: BusinessOnboardingProps) {
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "professional" | "enterprise">("starter");
  const [moniepointKey, setMoniepointKey] = useState("");
  const [showMoniepointKey, setShowMoniepointKey] = useState(false);
  const [paystackSecretKey, setPaystackSecretKey] = useState("");
  const [paystackPublicKey, setPaystackPublicKey] = useState("");
  const [showPaystackSecretKey, setShowPaystackSecretKey] = useState(false);
  const [paystackAccountNumber, setPaystackAccountNumber] = useState("5028910423");
  const [paystackAccountName, setPaystackAccountName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [brandColor, setBrandColor] = useState("#0d9488");
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");

  const [textilePrimarilySellsBy, setTextilePrimarilySellsBy] = useState<"yard" | "roll" | "both">("both");
  const [textileSubcategories, setTextileSubcategories] = useState<{ id: string; label: string; emoji: string; supportedUnits?: string[] }[]>([
    { id: "ankara", label: "Ankara", emoji: "Palette", supportedUnits: ["yard", "roll"] },
    { id: "lace", label: "Lace", emoji: "Sparkles", supportedUnits: ["yard", "roll"] },
    { id: "cotton_plain", label: "Cotton/Plain", emoji: "Scissors", supportedUnits: ["yard", "roll"] },
    { id: "aso_oke", label: "Aso-oke", emoji: "Crown", supportedUnits: ["yard", "roll"] },
    { id: "adire", label: "Adire", emoji: "Palette", supportedUnits: ["yard", "roll"] },
  ]);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const [boutiqueSubcategories, setBoutiqueSubcategories] = useState<{ id: string; label: string; emoji: string; supportedUnits?: string[] }[]>([
    { id: "shoes", label: "Shoes", emoji: "Footprints", supportedUnits: ["pcs", "pair"] },
    { id: "tops", label: "Tops", emoji: "Shirt", supportedUnits: ["pcs", "pack"] },
    { id: "bottoms", label: "Bottoms", emoji: "Shirt", supportedUnits: ["pcs", "pack"] },
    { id: "dresses", label: "Dresses", emoji: "Shirt", supportedUnits: ["pcs"] },
    { id: "accessories", label: "Accessories", emoji: "ShoppingBag", supportedUnits: ["pcs", "pack"] },
  ]);
  const [newBoutiqueSubcategoryName, setNewBoutiqueSubcategoryName] = useState("");

  useEffect(() => {
    const intended = sessionStorage.getItem("nexa_intended_business");
    if (intended) {
      setSelectedBusiness(intended);
      sessionStorage.removeItem("nexa_intended_business");
    }
  }, []);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [electronicsMainType, setElectronicsMainType] = useState<"devices" | "accessories" | "both" | undefined>(undefined);
  const [entryMethod, setEntryMethod] = useState<"camera" | "manual" | "skip" | "excel">("manual");
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([
    { id: "1", name: "", price: "", stock: "", unit: "pcs" },
  ]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    if (step === 0 && storeName.trim()) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2 && selectedBusiness) {
      if (selectedBusiness === "social_commerce") {
        setStoreSlug(storeName.toLowerCase().replace(/[^a-z0-9]/g, "-"));
        setStep(25); // Step 2.5: Online Store Config
      } else if (selectedBusiness === "electronics") {
        setStep(28); // Electronics Clarifying Question
      } else if (selectedBusiness === "textile") {
        setStep(27); // Textiles Clarifying Question
      } else if (selectedBusiness === "boutique") {
        setStep(29); // Boutique Subcategories Config
      } else {
        setStep(3);
        setSelectedCategories(new Set());
      }
    } else if (step === 25) {
      setStep(3);
      setSelectedCategories(new Set());
    } else if (step === 27) {
      // Textiles: auto-select all configured subcategories
      const cats = new Set(textileSubcategories.map(c => c.id));
      setSelectedCategories(cats);

      // Prepopulate bulk entry with textiles
      const templates: PendingProduct[] = [
        { id: "1", name: "Ankara Lace (Ankara Roll)", price: "35000", stock: "10", unit: "roll", categoryId: "ankara" },
        { id: "2", name: "White Cord Lace Fabric", price: "8000", stock: "50", unit: "yard", categoryId: "lace" },
        { id: "3", name: "Premium Plain Cotton", price: "1800", stock: "150", unit: "yard", categoryId: "cotton_plain" }
      ];
      setPendingProducts(templates);
      setStep(3.5);
    } else if (step === 29) {
      // Boutique: auto-select all configured subcategories
      const cats = new Set(boutiqueSubcategories.map(c => c.id));
      setSelectedCategories(cats);

      // Prepopulate bulk entry with boutique templates
      const templates: PendingProduct[] = [
        { id: "1", name: "Premium Leather Shoes", price: "32000", stock: "30", unit: "pair", categoryId: "shoes" },
        { id: "2", name: "High-Waist Denim Jeans", price: "16500", stock: "50", unit: "pcs", categoryId: "bottoms" },
        { id: "3", name: "Cotton V-Neck T-Shirt", price: "7500", stock: "100", unit: "pcs", categoryId: "tops" }
      ];
      setPendingProducts(templates);
      setStep(3.5);
    } else if (step === 3 && selectedCategories.size > 0) {
      if (pendingProducts.length <= 1 && (!pendingProducts[0] || !pendingProducts[0].name.trim())) {
        if (selectedBusiness === "restaurant") {
          setPendingProducts([
            { id: "1", name: "Party Jollof Rice & Chicken", price: "3500", costPrice: "2000", stock: "50", unit: "plate", categoryId: "grains" },
            { id: "2", name: "Grilled Peppered Tilapia Fish", price: "6500", costPrice: "4000", stock: "20", unit: "pcs", categoryId: "proteins" },
            { id: "3", name: "Beef Suya Skewer", price: "1500", costPrice: "800", stock: "100", unit: "portion", categoryId: "proteins" },
            { id: "4", name: "Fresh Fruit Smoothie", price: "1800", costPrice: "900", stock: "40", unit: "cup", categoryId: "drinks" },
          ]);
        } else if (selectedBusiness === "pharmacy") {
          setPendingProducts([
            { id: "1", name: "Paracetamol 500mg Tablets", price: "500", costPrice: "300", stock: "100", unit: "pack", categoryId: "pills" },
            { id: "2", name: "Amoxicillin 500mg Capsules", price: "1500", costPrice: "900", stock: "50", unit: "pack", categoryId: "pills" },
            { id: "3", name: "Vitamin C 100mg Tablets", price: "1000", costPrice: "600", stock: "60", unit: "bottle", categoryId: "pills" },
          ]);
        } else if (selectedBusiness === "electronics") {
          setPendingProducts([
            { id: "1", name: "Fast Charging USB-C Cable", price: "3500", costPrice: "1800", stock: "50", unit: "pcs", categoryId: "chargers" },
            { id: "2", name: "Wireless Bluetooth Earbuds", price: "18500", costPrice: "11000", stock: "25", unit: "pcs", categoryId: "audio" },
            { id: "3", name: "20,000mAh Power Bank", price: "14500", costPrice: "9000", stock: "30", unit: "pcs", categoryId: "powerbanks" },
          ]);
        }
      }
      setStep(3.5);
    } else if (step === 3.5) {
      if (entryMethod === "camera") {
        sessionStorage.setItem("nexa_open_scanner_after_onboarding", "true");
      } else if (entryMethod === "excel") {
        sessionStorage.setItem("nexa_open_import_after_onboarding", "true");
      }
      setStep(3.8);
    } else if (step === 3.8) {
      if (entryMethod === "manual") {
        setStep(4);
      } else {
        handleFinish();
      }
    }
  };

  const allCategories = selectedBusiness === "textile"
    ? textileSubcategories
    : selectedBusiness === "boutique"
    ? boutiqueSubcategories
    : (selectedBusiness ? CATEGORY_MAP[selectedBusiness] ?? [] : []);
  const activeCategories = allCategories.filter(c => selectedCategories.has(c.id));
  const bulkEntryCategories = activeCategories.length > 0 ? activeCategories : allCategories;

  const handleFinish = () => {
    if (selectedBusiness) {
      onComplete({
        businessType: selectedBusiness, 
        categories: Array.from(selectedCategories), 
        storeName: storeName.trim() || "My Store", 
        brandColor,
        moniepointKey,
        storeSlug,
        paystackPublicKey,
        paystackSecretKey,
        paystackAccountNumber: paystackAccountNumber || "5028910423",
        paystackAccountName: paystackAccountName || `${storeName.trim() || "My Store"} Operations`,
        paystackBankName: "Wema Bank / Titan Paystack",
        selectedPlan,
        electronicsMainType: selectedBusiness === "electronics" ? electronicsMainType : undefined,
        textilePrimarilySellsBy: selectedBusiness === "textile" ? textilePrimarilySellsBy : undefined,
        textileSubcategories: selectedBusiness === "textile" ? textileSubcategories : undefined,
        boutiqueSubcategories: selectedBusiness === "boutique" ? boutiqueSubcategories : undefined,
        initialItems: pendingProducts
          .filter(p => p.name.trim() !== "")
          .map(p => ({
            ...p,
            categoryId: p.categoryId || bulkEntryCategories[0]?.id || "misc"
          })),
        country,
        state,
        lga,
        entryMethod
      });
    }
  };

  const categories = allCategories;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "w-full rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8 transition-all duration-300 my-auto",
          (step === 4 || step === 3.5) ? "max-w-2xl" : "max-w-lg"
        )}
      >
        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {[0, 1, 2, 25, 28, 27, 3, 3.5, 4].map((i) => {
            if (i === 25 && selectedBusiness !== "social_commerce") return null;
            if (i === 28 && selectedBusiness !== "electronics") return null;
            if (i === 27 && selectedBusiness !== "textile") return null;
            let active = false;
            if (i === 25) {
              active = step > 2;
            } else if (i === 28) {
              active = step > 2;
            } else if (i === 27) {
              active = step > 2;
            } else if (i === 3.5) {
              active = step >= 3.5;
            } else {
              active = step >= i;
            }
            return <div key={i} className={cn("h-1.5 flex-1 rounded-full", active ? "bg-primary" : "bg-muted")} />;
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Store Name */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">What's your store name?</h2>
                <p className="mt-1 text-sm text-muted-foreground">This will appear on receipts and invoices.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name" className="text-sm font-medium">Store / Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="store-name"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Adebayo Electronics"
                      className="pl-10 h-12 text-base"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="store-country" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Country</Label>
                    <select
                      id="store-country"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        if (e.target.value !== "Nigeria") {
                          setState("");
                          setLga("");
                        }
                      }}
                      className="w-full h-11 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none"
                    >
                      <option value="Nigeria">Nigeria 🇳🇬</option>
                      <option value="Other">Other Country</option>
                    </select>
                  </div>

                  {country === "Nigeria" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="store-state" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State</Label>
                      <select
                        id="store-state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full h-11 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none"
                      >
                        <option value="">-- Select State --</option>
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="store-state" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State / Region</Label>
                      <Input
                        id="store-state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. California"
                        className="h-11 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="store-lga" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {country === "Nigeria" ? "LGA (Local Government Area)" : "County / Local District"}
                  </Label>
                  <Input
                    id="store-lga"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder={country === "Nigeria" ? "e.g. Ikeja" : "e.g. Santa Clara County"}
                    className="h-11 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
                  Skip setup
                </button>
                <Button onClick={handleNext} disabled={!storeName.trim()} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Branding */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Choose your brand color</h2>
                <p className="mt-1 text-sm text-muted-foreground">This color will be used throughout your Nexa OS interface.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBrandColor(c.value)}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                      brandColor === c.value
                        ? "border-[color:var(--c)] bg-[color:var(--c)]/5 shadow-sm"
                        : "border-border hover:border-[color:var(--c)]/40"
                    )}
                    style={{ "--c": c.value } as React.CSSProperties}
                  >
                    <div className="h-8 w-8 rounded-full border border-black/5 shadow-sm" style={{ backgroundColor: c.value }} />
                    <span className="text-xs font-medium">{c.label}</span>
                    {brandColor === c.value && (
                      <div className="absolute top-1.5 right-1.5 rounded-full bg-[color:var(--c)] p-0.5">
                        <Check className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(0)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Business Type */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">What type of business do you run?</h2>
                <p className="mt-1 text-sm text-muted-foreground">This helps us set up the right categories for you.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setSelectedBusiness(bt.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
                      selectedBusiness === bt.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <bt.icon className={cn("h-7 w-7", selectedBusiness === bt.id ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{bt.label}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{bt.description}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={!selectedBusiness} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 25: Online Store Config (Social Commerce only) */}
          {step === 25 && (
            <motion.div
              key="step-25"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Set up your storefront</h2>
                <p className="mt-1 text-sm text-muted-foreground">Configure how your customers will find and pay you.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Unique Store Link</Label>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">nexa.store/</span>
                    <Input 
                      value={storeSlug}
                      onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))}
                      className="h-9 px-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Paystack Account Number</Label>
                    <Input 
                      value={paystackAccountNumber}
                      onChange={e => setPaystackAccountNumber(e.target.value)}
                      placeholder="5028910423"
                      className="h-9 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Account Beneficiary Name</Label>
                    <Input 
                      value={paystackAccountName || `${storeName || "My Store"} Operations`}
                      onChange={e => setPaystackAccountName(e.target.value)}
                      placeholder="e.g. Store Operations"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-sm font-medium">Paystack Secret Key (Optional)</Label>
                   <div className="relative">
                     <Input 
                        type={showPaystackSecretKey ? "text" : "password"}
                        value={paystackSecretKey}
                        onChange={e => setPaystackSecretKey(e.target.value)}
                        placeholder="sk_live_..."
                        className="h-10 pr-10"
                     />
                     <button
                       type="button"
                       onClick={() => setShowPaystackSecretKey(!showPaystackSecretKey)}
                       className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                       aria-label={showPaystackSecretKey ? "Hide API key" : "Show API key"}
                     >
                       {showPaystackSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                     </button>
                   </div>
                   <p className="text-[11px] text-muted-foreground italic">Your customers will transfer or pay directly using Paystack at checkout.</p>
                </div>

                <div className="space-y-2">
                   <Label className="text-sm font-medium">Moniepoint API Key (Optional)</Label>
                   <div className="relative">
                     <Input 
                        type={showMoniepointKey ? "text" : "password"}
                        value={moniepointKey}
                        onChange={e => setMoniepointKey(e.target.value)}
                        placeholder="sk_live_..."
                        className="h-10 pr-10"
                     />
                     <button
                       type="button"
                       onClick={() => setShowMoniepointKey(!showMoniepointKey)}
                       className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                       aria-label={showMoniepointKey ? "Hide API key" : "Show API key"}
                     >
                       {showMoniepointKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                     </button>
                   </div>
                   <p className="text-[11px] text-muted-foreground italic">You can add this later in settings to enable automated payments.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={!storeSlug} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 28: Electronics Clarifying Question */}
          {step === 28 && (
            <motion.div
              key="step-28"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Do you sell mainly devices, accessories, or both?</h2>
                <p className="mt-1 text-sm text-muted-foreground">This helps us pre-populate your product categories and bulk entry templates.</p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { id: "devices", label: "Mainly Devices", description: "Phones, Tablets, Wearables, etc." },
                  { id: "accessories", label: "Mainly Accessories", description: "Cases, Chargers, Earphones, Screen Protectors, etc." },
                  { id: "both", label: "Both Devices & Accessories", description: "A balanced mix of both electronics and accessories." }
                ].map((item) => {
                  const isSelected = electronicsMainType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setElectronicsMainType(item.id as "devices" | "accessories" | "both")}
                      className={cn(
                        "w-full text-left flex flex-col gap-1 rounded-xl border p-4 transition-all duration-200 cursor-pointer select-none",
                        isSelected
                          ? "shadow-sm border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-accent/10"
                      )}
                      style={
                        isSelected ? { 
                          borderColor: brandColor, 
                          backgroundColor: `${brandColor}0a` 
                        } : {}
                      }
                    >
                      <span className="font-semibold text-sm text-foreground">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={() => {
                    const cats = new Set<string>();
                    if (electronicsMainType === "devices") {
                      cats.add("devices");
                      cats.add("audio");
                    } else if (electronicsMainType === "accessories") {
                      cats.add("accessories");
                      cats.add("cases");
                      cats.add("chargers");
                      cats.add("audio");
                      cats.add("protection");
                      cats.add("powerbanks");
                    } else {
                      cats.add("devices");
                      cats.add("accessories");
                      cats.add("cases");
                      cats.add("chargers");
                      cats.add("audio");
                      cats.add("protection");
                      cats.add("powerbanks");
                      cats.add("repairs");
                    }
                    setSelectedCategories(cats);

                    let templates: PendingProduct[] = [];
                    if (electronicsMainType === "devices") {
                      templates = [
                        { id: "1", name: "iPhone 15 Pro (128GB)", price: "1200000", stock: "5", unit: "pcs", categoryId: "devices" },
                        { id: "2", name: "Samsung Galaxy S24 Ultra", price: "1450000", stock: "4", unit: "pcs", categoryId: "devices" },
                        { id: "3", name: "iPad Air M2 (Wifi)", price: "750000", stock: "3", unit: "pcs", categoryId: "devices" },
                      ];
                    } else if (electronicsMainType === "accessories") {
                      templates = [
                        { id: "1", name: "iPhone 15 Silicon Case", price: "15000", stock: "50", unit: "pcs", categoryId: "cases" },
                        { id: "2", name: "USB-C 20W Fast Charger", price: "12000", stock: "100", unit: "pcs", categoryId: "chargers" },
                        { id: "3", name: "AirPods Pro 2", price: "250000", stock: "10", unit: "pcs", categoryId: "audio" },
                        { id: "4", name: "Tempered Glass Screen Protector", price: "5000", stock: "120", unit: "pcs", categoryId: "protection" },
                      ];
                    } else {
                      templates = [
                        { id: "1", name: "iPhone 15 Pro (128GB)", price: "1200000", stock: "5", unit: "pcs", categoryId: "devices" },
                        { id: "2", name: "iPhone 15 Silicon Case", price: "15000", stock: "50", unit: "pcs", categoryId: "cases" },
                        { id: "3", name: "USB-C 20W Fast Charger", price: "12000", stock: "100", unit: "pcs", categoryId: "chargers" },
                        { id: "4", name: "AirPods Pro 2", price: "250000", stock: "10", unit: "pcs", categoryId: "audio" },
                      ];
                    }
                    setPendingProducts(templates);
                    setStep(3);
                  }} 
                  disabled={!electronicsMainType} 
                  className="gap-1.5" 
                  style={{ backgroundColor: brandColor, color: "#fff" }}
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 29: Boutique Clarifying Question & Subcategories */}
          {step === 29 && (
            <motion.div
              key="step-29"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Configure Boutique & Clothing</h2>
                <p className="mt-1 text-sm text-muted-foreground">Manage your clothing subcategories or size profiles.</p>
              </div>

              {/* Subcategories Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Boutique Subcategories</Label>
                  <span className="text-xs text-muted-foreground">Suggested (editable/removable)</span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {boutiqueSubcategories.map((sub, idx) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      {(() => { const Icon = getLucideIcon(sub.emoji); return <Icon className="h-5 w-5 text-muted-foreground" />; })()}
                      <Input
                        value={sub.label}
                        onChange={(e) => {
                          const updated = [...boutiqueSubcategories];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setBoutiqueSubcategories(updated);
                        }}
                        className="h-9 text-sm text-foreground bg-background animate-in fade-in duration-200"
                        placeholder="Subcategory Name"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = boutiqueSubcategories.filter((_, i) => i !== idx);
                          setBoutiqueSubcategories(updated);
                        }}
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <span className="text-lg font-bold">×</span>
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Subcategory */}
                <div className="flex gap-2">
                  <Input
                    value={newBoutiqueSubcategoryName}
                    onChange={(e) => setNewBoutiqueSubcategoryName(e.target.value)}
                    placeholder="e.g. Traditional, Swimwear, Loungewear"
                    className="h-9 text-sm text-foreground bg-background"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newBoutiqueSubcategoryName.trim()) {
                        e.preventDefault();
                        const id = newBoutiqueSubcategoryName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                        if (!boutiqueSubcategories.some(s => s.id === id)) {
                          setBoutiqueSubcategories([...boutiqueSubcategories, {
                            id,
                            label: newBoutiqueSubcategoryName.trim(),
                            emoji: "Shirt",
                            supportedUnits: ["pcs", "pair", "pack"]
                          }]);
                        }
                        setNewBoutiqueSubcategoryName("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newBoutiqueSubcategoryName.trim()) {
                        const id = newBoutiqueSubcategoryName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                        if (!boutiqueSubcategories.some(s => s.id === id)) {
                          setBoutiqueSubcategories([...boutiqueSubcategories, {
                            id,
                            label: newBoutiqueSubcategoryName.trim(),
                            emoji: "Shirt",
                            supportedUnits: ["pcs", "pair", "pack"]
                          }]);
                        }
                        setNewBoutiqueSubcategoryName("");
                      }
                    }}
                    size="sm"
                    className="h-9 px-3 shrink-0"
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={boutiqueSubcategories.length === 0}
                  className="gap-1.5" 
                  style={{ backgroundColor: brandColor, color: "#fff" }}
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 27: Textiles Clarifying Question & Subcategories */}
          {step === 27 && (
            <motion.div
              key="step-27"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Configure Textiles & Yards</h2>
                <p className="mt-1 text-sm text-muted-foreground">Set up default units and manage your fabric subcategories.</p>
              </div>

              {/* Unit Selection */}
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">How do you primarily sell fabric?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "yard", label: "primarily by Yard", desc: "Yard defaults" },
                    { id: "roll", label: "primarily by Roll", desc: "Roll defaults" },
                    { id: "both", label: "Both Yard & Roll", desc: "Sets both units" }
                  ].map((u) => {
                    const isSelected = textilePrimarilySellsBy === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setTextilePrimarilySellsBy(u.id as "yard" | "roll" | "both")}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer select-none",
                          isSelected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground hover:bg-accent/10"
                        )}
                        style={
                          isSelected ? { 
                            borderColor: brandColor, 
                            backgroundColor: `${brandColor}0a` 
                          } : {}
                        }
                      >
                        <span className="text-xs font-semibold">{u.label}</span>
                        <span className="text-[10px] opacity-70 mt-0.5">{u.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcategories Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Fabric Subcategories / Profiles</Label>
                  <span className="text-xs text-muted-foreground">Suggested (editable)</span>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {textileSubcategories.map((sub, idx) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      {(() => { const Icon = getLucideIcon(sub.emoji); return <Icon className="h-5 w-5 text-muted-foreground" />; })()}
                      <Input
                        value={sub.label}
                        onChange={(e) => {
                          const updated = [...textileSubcategories];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setTextileSubcategories(updated);
                        }}
                        className="h-9 text-sm text-foreground bg-background"
                        placeholder="Subcategory Name"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = textileSubcategories.filter((_, i) => i !== idx);
                          setTextileSubcategories(updated);
                        }}
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <span className="text-lg font-bold">×</span>
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Subcategory */}
                <div className="flex gap-2">
                  <Input
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    placeholder="e.g. Silk, Brocade, Velvet"
                    className="h-9 text-sm text-foreground bg-background"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubcategoryName.trim()) {
                        e.preventDefault();
                        const id = newSubcategoryName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                        if (!textileSubcategories.some(s => s.id === id)) {
                          setTextileSubcategories([...textileSubcategories, {
                            id,
                            label: newSubcategoryName.trim(),
                            emoji: "Scissors",
                            supportedUnits: ["yard", "roll"]
                          }]);
                        }
                        setNewSubcategoryName("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newSubcategoryName.trim()) {
                        const id = newSubcategoryName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                        if (!textileSubcategories.some(s => s.id === id)) {
                          setTextileSubcategories([...textileSubcategories, {
                            id,
                            label: newSubcategoryName.trim(),
                            emoji: "Scissors",
                            supportedUnits: ["yard", "roll"]
                          }]);
                        }
                        setNewSubcategoryName("");
                      }
                    }}
                    className="h-9 px-3 shrink-0"
                    style={{ backgroundColor: brandColor, color: "#fff" }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={textileSubcategories.length === 0}
                  className="gap-1.5"
                  style={{ backgroundColor: brandColor, color: "#fff" }}
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Categories */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Select your product categories</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick the ones that match your inventory.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all",
                      selectedCategories.has(cat.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {(() => { const Icon = getLucideIcon(cat.emoji); return <Icon className="h-5 w-5" />; })()}
                    <span className="text-sm font-medium">{cat.label}</span>
                    {selectedCategories.has(cat.id) && <Check className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(selectedBusiness === "electronics" ? 28 : 2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={selectedCategories.size === 0} className="gap-1.5" style={{ backgroundColor: brandColor, color: "#fff" }}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3.5: Inventory Entry Method Selection */}
          {step === 3.5 && (
            <motion.div
              key="step-3.5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">How would you like to add your inventory?</h2>
                <p className="mt-1 text-sm text-muted-foreground">add more later — this just gets you started.</p>
              </div>

              <div className="flex flex-col gap-3 max-h-[385px] overflow-y-auto pr-1">
                {ENTRY_METHODS.map((m) => {
                  const isSelected = entryMethod === m.id;
                  const IconComponent = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEntryMethod(m.id as "camera" | "manual" | "skip" | "excel")}
                      className={cn(
                        "w-full text-left flex gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer select-none",
                        isSelected
                          ? "shadow-sm border-primary bg-primary/5 dark:bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-accent/10"
                      )}
                      style={
                        isSelected ? { 
                          borderColor: brandColor, 
                          backgroundColor: `${brandColor}0a` 
                        } : {}
                      }
                    >
                      {/* Left container */}
                      <div 
                        className={cn(
                          "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border",
                          isSelected 
                            ? "border-primary/20 text-primary" 
                            : "border-border text-muted-foreground bg-muted/30"
                        )}
                        style={
                          isSelected ? { 
                            color: brandColor,
                            borderColor: `${brandColor}20`,
                            backgroundColor: `${brandColor}0f`
                          } : {}
                        }
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {/* Right content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                          <span className="font-semibold text-sm text-foreground leading-none">
                            {m.title}
                          </span>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium inline-block w-max", m.badgeColor)}>
                            {m.subtitle}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} className="gap-1.5" style={{ backgroundColor: brandColor, color: "#fff" }}>
                  Select Plan <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3.8: Tier Selection */}
          {step === 3.8 && (
            <motion.div
              key="step-3.8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Select Your NexaStoreOS Plan</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose your tier. All plans start with a <strong>14-Day Free Trial</strong>.</p>
              </div>

              <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                {[
                  {
                    id: "starter",
                    name: "Starter Plan",
                    price: "₦3,500/mo",
                    limit: "Up to 2,000 Products",
                    badge: "14-Day Free Trial",
                    badgeBg: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
                    features: ["Sales & Inventory Tracking", "Daily Sales Reports", "Cloud Backup", "1 Staff Account"]
                  },
                  {
                    id: "professional",
                    name: "Pro Plan",
                    price: "₦6,500/mo",
                    limit: "Up to 10,000 Products",
                    badge: "MOST POPULAR",
                    badgeBg: "bg-blue-600 text-white",
                    features: ["Everything in Starter", "Stock Alerts & Low Stock", "Profit & Expense Tracking", "Up to 5 Staff Accounts"]
                  },
                  {
                    id: "enterprise",
                    name: "Enterprise Plan",
                    price: "Custom / ₦45,000/mo",
                    limit: "Unlimited Products",
                    badge: "Enterprise",
                    badgeBg: "bg-purple-600 text-white",
                    features: ["Everything in Pro Plan", "Multi-Branch Management", "Custom Integrations", "Dedicated Account Manager"]
                  }
                ].map((p) => {
                  const isSelected = selectedPlan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id as "starter" | "professional" | "enterprise")}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none relative flex flex-col gap-1.5",
                        isSelected
                          ? "shadow-sm border-primary bg-primary/5 dark:bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-accent/10"
                      )}
                      style={
                        isSelected ? { 
                          borderColor: brandColor, 
                          backgroundColor: `${brandColor}0a` 
                        } : {}
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{p.name}</span>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", p.badgeBg)}>
                            {p.badge}
                          </span>
                        </div>
                        <span className="font-extrabold text-sm" style={{ color: brandColor }}>
                          {p.price}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-muted-foreground">{p.limit}</p>

                      <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                        {p.features.map((f, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-1.5">
                            <span className="text-emerald-500 font-bold text-xs">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Zero charge today. Your 14-day free trial starts immediately upon completion.</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3.5)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} className="gap-1.5" style={{ backgroundColor: brandColor, color: "#fff" }}>
                  {entryMethod === "manual" ? "Add Products" : "Launch Store OS"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Bulk Products */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Add your first products</h2>
                <p className="mt-1 text-sm text-muted-foreground">Quickly add items to get your inventory started.</p>
              </div>

              <BulkProductEntry 
                products={pendingProducts} 
                setProducts={setPendingProducts} 
                categories={bulkEntryCategories}
                businessType={selectedBusiness ?? undefined}
              />

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3.5)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleFinish} className="gap-1.5" style={{ backgroundColor: brandColor, color: "#fff" }}>
                  Setup Complete <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
