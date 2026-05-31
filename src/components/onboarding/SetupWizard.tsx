import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Sparkles, Layers, ArrowRight, ArrowLeft, 
  Check, Play, Plus, Trash2, ShoppingBag, Utensils, 
  Sprout, Globe, Pill, Factory, Scissors, Package, Archive,
  Palette, Tag, CreditCard, CheckCircle2, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const NAIRA = "₦";

// Brand presets color map
export const BRAND_COLORS = [
  { name: "Teal", hex: "#0d9488", class: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500", border: "border-teal-500", glow: "shadow-teal-500/20" },
  { name: "Blue", hex: "#3b82f6", class: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500", border: "border-blue-500", glow: "shadow-blue-500/20" },
  { name: "Indigo", hex: "#6366f1", class: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500", border: "border-indigo-500", glow: "shadow-indigo-500/20" },
  { name: "Purple", hex: "#8b5cf6", class: "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500", border: "border-purple-500", glow: "shadow-purple-500/20" },
  { name: "Orange", hex: "#f97316", class: "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400", border: "border-orange-500", glow: "shadow-orange-500/20" },
  { name: "Pink", hex: "#ec4899", class: "bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500", border: "border-pink-500", glow: "shadow-pink-500/20" },
];

// Industry list
const SECTORS = [
  { id: "retail", label: "Retail / POS", emoji: "🛍️", icon: ShoppingBag, desc: "Boutiques, general groceries, electronics shops." },
  { id: "restaurant", label: "Restaurant / Food", emoji: "🍳", icon: Utensils, desc: "Cafes, diners, bars, and food vendors." },
  { id: "agriculture", label: "Agriculture", emoji: "🚜", icon: Sprout, desc: "Farms, seed retailers, livestock suppliers." },
  { id: "online_vendor", label: "Online Vendor", emoji: "📱", icon: Globe, desc: "Instagram shops, social sellers, e-commerce." },
  { id: "pharmacy", label: "Pharmacy & Health", emoji: "💊", icon: Pill, desc: "Chemist shops, drug dispensaries, pharmacies." },
  { id: "manufacturing", label: "Manufacturing", emoji: "⚙️", icon: Factory, desc: "Factories, raw materials processors, workshops." },
  { id: "textile", label: "Textile", emoji: "🧵", icon: Scissors, desc: "Fabric stores, designers, apparel tailors." },
  { id: "wholesale", label: "Wholesale", emoji: "📦", icon: Package, desc: "Bulk distributors, FMCG suppliers, warehouses." },
  { id: "general", label: "General Inventory", emoji: "💼", icon: Archive, desc: "Multi-purpose stock systems and office goods." },
];

// Industry presets categories
const CATEGORY_PRESETS: Record<string, string[]> = {
  retail: ["Clothing 👗", "Electronics ⚡", "Groceries 🛒", "Cosmetics 💄", "Home Decor 🛋️", "Toys 🧸"],
  restaurant: ["Beverages 🥤", "Appetizers 🥗", "Main Course 🥩", "Desserts 🍰", "Sides 🍟", "Breakfast 🍳"],
  agriculture: ["Grains 🌾", "Vegetables 🥕", "Fruits 🍎", "Seeds 🌱", "Fertilizers 🧪", "Livestock 🐂"],
  online_vendor: ["Clothing 👗", "Shoes 👟", "Accessories 💍", "Handbags 👜", "Electronics ⚡", "Beauty 💅"],
  pharmacy: ["Tablets 💊", "Syrups 🧪", "Inhalers 💨", "Supplements 🧴", "Devices 🩺", "First Aid 🩹"],
  manufacturing: ["Raw Materials 🪵", "Finished Goods 📦", "Spare Parts ⚙️", "Packaging 🏷️", "Chemicals 🧪"],
  textile: ["Fabrics 🧵", "Threads 🪡", "Buttons 🔘", "Yarn 🧶", "Dyes 🎨", "Tools ✂️"],
  wholesale: ["FMCG 📦", "Bulk Grains 🌾", "Beverages 🥤", "Toiletries 🧻", "Packaging Materials 📦"],
  general: ["General Goods 📦", "Office Supplies 📎", "Tools 🛠️", "Equipment 🏗️"],
};

export interface QuickProductInput {
  name: string;
  price: string;
  stock: string;
  unit: string;
}

export interface SetupWizardData {
  storeName: string;
  slug: string;
  moniepointKey: string;
  primaryColor: string;
  sector: string;
  categories: string[];
  products: QuickProductInput[];
}

interface SetupWizardProps {
  onComplete: (data: SetupWizardData) => Promise<void>;
  loading: boolean;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function SetupWizard({ onComplete, loading }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);

  // Setup Form States
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [moniepointKey, setMoniepointKey] = useState("");
  const [primaryColor, setPrimaryColor] = useState(BRAND_COLORS[2]); // Default to Indigo
  const [selectedSector, setSelectedSector] = useState(SECTORS[0]); // Default to Retail
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [products, setProducts] = useState<QuickProductInput[]>([
    { name: "", price: "", stock: "", unit: "Piece" }
  ]);

  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  const handleNext = () => {
    if (step === 1 && !storeName.trim()) {
      toast.error("Please enter a valid store name.");
      return;
    }
    if (step === 4 && customCategories.length === 0) {
      toast.error("Please select or add at least one catalog category.");
      return;
    }
    setDirection(1);
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((prev) => prev - 1);
  };

  // Sector changed -> reset categories to chosen sector presets
  const selectSector = (sector: typeof SECTORS[0]) => {
    setSelectedSector(sector);
    setCustomCategories(CATEGORY_PRESETS[sector.id] || []);
  };

  // Initialize presets on step 4 transition if empty
  const ensureCategoriesInitialized = () => {
    if (customCategories.length === 0) {
      setCustomCategories(CATEGORY_PRESETS[selectedSector.id] || []);
    }
  };

  useEffect(() => {
    if (step === 4) {
      ensureCategoriesInitialized();
    }
  }, [step, selectedSector.id]);

  const toggleCategory = (cat: string) => {
    if (customCategories.includes(cat)) {
      setCustomCategories(customCategories.filter(c => c !== cat));
    } else {
      setCustomCategories([...customCategories, cat]);
    }
  };

  const addCustomCategory = () => {
    const text = categoryInput.trim();
    if (!text) return;
    if (customCategories.includes(text)) {
      toast.error("Category already added");
      return;
    }
    setCustomCategories([...customCategories, text]);
    setCategoryInput("");
  };

  // Spreadsheet table rows management
  const addProductRow = () => {
    setProducts([...products, { name: "", price: "", stock: "", unit: "Piece" }]);
  };

  const deleteProductRow = (index: number) => {
    if (products.length === 1) {
      setProducts([{ name: "", price: "", stock: "", unit: "Piece" }]);
      return;
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProductRow = (index: number, key: keyof QuickProductInput, value: string) => {
    const next = [...products];
    next[index] = { ...next[index], [key]: value };
    setProducts(next);
  };

  const handleWizardSubmit = async () => {
    // Validate products (only rows with items)
    const validProducts = products.filter(p => p.name.trim() !== "");
    for (const p of validProducts) {
      const priceVal = parseFloat(p.price);
      const stockVal = parseFloat(p.stock);
      if (isNaN(priceVal) || priceVal < 0) {
        toast.error(`Invalid selling price for item: ${p.name}`);
        return;
      }
      if (isNaN(stockVal) || stockVal < 0) {
        toast.error(`Invalid current stock for item: ${p.name}`);
        return;
      }
    }

    try {
      await onComplete({
        storeName: storeName.trim(),
        slug: slug.trim(),
        moniepointKey: moniepointKey.trim(),
        primaryColor: primaryColor.hex,
        sector: selectedSector.id,
        categories: customCategories,
        products: validProducts
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to finalize onboarding setup");
    }
  };

  return (
    <div className="w-full max-w-2xl bg-card border-2 border-border shadow-2xl rounded-[2.5rem] relative overflow-hidden flex flex-col min-h-[560px]">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-muted">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: "20%" }}
          animate={{ width: `${(step / 5) * 100}%` }}
          transition={{ duration: 0.3 }}
          style={{ backgroundColor: primaryColor.hex }}
        />
      </div>

      {/* Steps indicator */}
      <div className="px-8 pt-8 pb-4 flex justify-between items-center select-none border-b border-border/40">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Onboarding Progress</span>
          <h2 className="text-sm font-extrabold uppercase mt-0.5 tracking-tight flex items-center gap-1.5">
            Step {step} of 5 <span className="text-muted-foreground/30">|</span> <span style={{ color: primaryColor.hex }}>{
              step === 1 ? "Store Profile & Integrations" :
              step === 2 ? "Aesthetic Branding" :
              step === 3 ? "Sector Selection" :
              step === 4 ? "Categories Mapping" :
              "Bulk Inventory Load"
            }</span>
          </h2>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className="h-2 w-2 rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: step === s ? primaryColor.hex : step > s ? `${primaryColor.hex}40` : "var(--muted)" 
              }}
            />
          ))}
        </div>
      </div>

      {/* Main card views */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-[380px] relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full flex-1 flex flex-col"
          >
            {/* STEP 1: IDENTITY & INTEGRATIONS */}
            {step === 1 && (
              <div className="space-y-5 py-2">
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" style={{ color: primaryColor.hex }} /> Identity & Sync Key
                  </h3>
                  <p className="text-xs text-muted-foreground">Setup your core shop profile parameters and link bank webhook feeds.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="wiz-storename" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Store / Merchant Name</Label>
                    <Input
                      id="wiz-storename"
                      placeholder="e.g. Alaba Wholesale Merchants"
                      value={storeName}
                      onChange={(e) => handleStoreNameChange(e.target.value)}
                      className="h-12 rounded-xl border-2 font-bold focus-visible:ring-0 focus-visible:border-primary transition-all text-sm px-4"
                      style={{ borderColor: storeName ? `${primaryColor.hex}40` : "" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="wiz-slug" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Shop Web Address URL</Label>
                    <div className="relative">
                      <Input
                        id="wiz-slug"
                        placeholder="alaba-wholesale"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}
                        className="h-12 rounded-xl border-2 font-black font-mono focus-visible:ring-0 focus-visible:border-primary transition-all text-sm pl-4 pr-24"
                        style={{ borderColor: slug ? `${primaryColor.hex}40` : "" }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground pointer-events-none">
                        .nexastore.com
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="wiz-mkey" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Moniepoint API Client Key (Optional)</Label>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">Auto-Detect Payments</span>
                    </div>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="wiz-mkey"
                        type="password"
                        placeholder="mp_live_xxxxxxxxx"
                        value={moniepointKey}
                        onChange={(e) => setMoniepointKey(e.target.value)}
                        className="h-12 rounded-xl border-2 font-mono focus-visible:ring-0 focus-visible:border-primary transition-all text-sm pl-10 pr-4"
                        style={{ borderColor: moniepointKey ? `${primaryColor.hex}40` : "" }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal italic px-1">
                      Link your Moniepoint API key to mirror instant bank transfers directly onto the POS checkout panel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: AESTHETIC BRANDING */}
            {step === 2 && (
              <div className="space-y-6 py-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                    <Palette className="h-5 w-5" style={{ color: primaryColor.hex }} /> Aesthetic Branding
                  </h3>
                  <p className="text-xs text-muted-foreground">Select a curated brand primary preset theme to paint your NEXA OS checkout and settings dashboards.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1 py-4">
                  {/* Swatches selection grid */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Theme Preset</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {BRAND_COLORS.map((preset) => {
                        const isSelected = primaryColor.name === preset.name;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setPrimaryColor(preset)}
                            className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 group select-none relative overflow-hidden ${
                              isSelected ? "bg-muted/50" : "bg-transparent border-border/80 hover:border-primary/40"
                            }`}
                            style={{ borderColor: isSelected ? preset.hex : "" }}
                          >
                            <span 
                              className="h-6 w-6 rounded-full shadow-md shrink-0 block transition-transform group-hover:scale-105" 
                              style={{ backgroundColor: preset.hex }} 
                            />
                            <span className={`text-[10px] font-black uppercase tracking-tight ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{preset.name}</span>
                            {isSelected && (
                              <div className="absolute top-1 right-1 h-3 w-3 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: preset.hex }}>
                                <Check className="h-2 w-2" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Real-time Dashboard Preview Panel */}
                  <div className="rounded-3xl border border-border bg-muted/40 p-4 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Sparkles className="h-10 w-10" style={{ color: primaryColor.hex }} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 block">Live UI Theme Preview</span>
                    
                    <div className="rounded-xl border border-border bg-card p-3 space-y-3 shadow-sm">
                      {/* Fake header */}
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor.hex }} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{storeName || "My Store"}</span>
                        </div>
                        <div className="h-4 w-12 rounded bg-muted animate-pulse" />
                      </div>
                      
                      {/* Fake buttons & pills */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-muted-foreground">Product Price</span>
                          <span className="font-mono text-xs font-black" style={{ color: primaryColor.hex }}>{NAIRA}15,500</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-7 flex-1 rounded-lg flex items-center justify-center text-[9px] font-black uppercase text-white shadow-sm transition-colors" style={{ backgroundColor: primaryColor.hex }}>
                            Complete Sale
                          </div>
                          <div className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-xs" style={{ color: primaryColor.hex }}>
                            +
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SECTOR SELECTION */}
            {step === 3 && (
              <div className="space-y-4 py-2 flex-1 flex flex-col">
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                    <Layers className="h-5 w-5" style={{ color: primaryColor.hex }} /> Sector Selection
                  </h3>
                  <p className="text-xs text-muted-foreground">Select your business category to configure specialized inventory presets and workflows.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto max-h-[300px] pr-1 py-2 flex-1">
                  {SECTORS.map((sector) => {
                    const isSelected = selectedSector.id === sector.id;
                    const Icon = sector.icon;
                    return (
                      <button
                        key={sector.id}
                        type="button"
                        onClick={() => selectSector(sector)}
                        className={`p-3.5 rounded-2xl border-2 transition-all text-left flex flex-col gap-1.5 group select-none relative ${
                          isSelected ? "bg-muted/50" : "bg-card border-border/80 hover:border-primary/40 hover:bg-muted/10"
                        }`}
                        style={{ borderColor: isSelected ? primaryColor.hex : "" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-primary bg-primary/10`} style={{ color: primaryColor.hex, backgroundColor: `${primaryColor.hex}15` }}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-lg">{sector.emoji}</span>
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-tight text-foreground block mt-1">{sector.label}</span>
                        <p className="text-[9px] text-muted-foreground leading-normal font-medium">{sector.desc}</p>
                        {isSelected && (
                          <div className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor.hex }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: CUSTOM CATALOG CATEGORIES */}
            {step === 4 && (
              <div className="space-y-5 py-2 flex-1 flex flex-col">
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                    <Tag className="h-5 w-5" style={{ color: primaryColor.hex }} /> Custom Catalog Categories
                  </h3>
                  <p className="text-xs text-muted-foreground">Select from initial {selectedSector.label} categories or input your own bespoke tags.</p>
                </div>

                <div className="space-y-4 flex-1 flex flex-col justify-between py-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pre-selected Category Presets</Label>
                    <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1">
                      {(CATEGORY_PRESETS[selectedSector.id] || []).map((preset) => {
                        const isSelected = customCategories.includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => toggleCategory(preset)}
                            className="h-8 px-3 rounded-full border-2 text-xs font-bold uppercase transition-all flex items-center gap-1 select-none active:scale-95"
                            style={{ 
                              borderColor: isSelected ? primaryColor.hex : "var(--border)",
                              backgroundColor: isSelected ? `${primaryColor.hex}10` : "transparent",
                              color: isSelected ? primaryColor.hex : "inherit"
                            }}
                          >
                            {preset}
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-cat-input" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Add Bespoke Category Tag</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom-cat-input"
                        placeholder="e.g. Designer Wears 👗"
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
                        className="h-10 rounded-xl border-2 text-xs"
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={addCustomCategory} 
                        className="h-10 rounded-xl uppercase px-4 text-[10px] font-black tracking-wider"
                        style={{ backgroundColor: primaryColor.hex }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>

                  {customCategories.length > 0 && (
                    <div className="rounded-2xl border border-border/80 bg-muted/20 p-3">
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 block mb-1.5">Active Catalog Categories ({customCategories.length})</span>
                      <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto">
                        {customCategories.map((c) => (
                          <span 
                            key={c}
                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-background border border-border/70 text-foreground"
                          >
                            {c}
                            <button 
                              type="button" 
                              onClick={() => toggleCategory(c)} 
                              className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: BULK PRODUCT ENTRY */}
            {step === 5 && (
              <div className="space-y-4 py-2 flex-1 flex flex-col min-h-[350px]">
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                    <Archive className="h-5 w-5" style={{ color: primaryColor.hex }} /> Quick / Bulk Product Entry
                  </h3>
                  <p className="text-xs text-muted-foreground">Load your initial products and quantities to start selling instantly upon launching your dashboard.</p>
                </div>

                <div className="flex-1 flex flex-col min-h-[200px] overflow-hidden border border-border rounded-2xl bg-muted/15 shadow-inner">
                  {/* Spreadsheet Header */}
                  <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground select-none">
                    <div className="col-span-5 pl-1">Item Name</div>
                    <div className="col-span-2">Selling Price</div>
                    <div className="col-span-2">Initial Stock</div>
                    <div className="col-span-2">Base Unit</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {/* Spreadsheet Rows */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[170px]">
                    {products.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Input
                            placeholder="e.g. Paracetamol tablets"
                            value={p.name}
                            onChange={(e) => updateProductRow(idx, "name", e.target.value)}
                            className="h-9 rounded-lg border-2 text-xs font-bold"
                          />
                        </div>
                        <div className="col-span-2 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{NAIRA}</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={p.price}
                            onChange={(e) => updateProductRow(idx, "price", e.target.value)}
                            className="h-9 rounded-lg border-2 text-xs font-mono font-bold pl-5 pr-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="0"
                            value={p.stock}
                            onChange={(e) => updateProductRow(idx, "stock", e.target.value)}
                            className="h-9 rounded-lg border-2 text-xs font-mono font-bold px-2"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder="Piece"
                            value={p.unit}
                            onChange={(e) => updateProductRow(idx, "unit", e.target.value)}
                            className="h-9 rounded-lg border-2 text-xs font-bold px-2"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => deleteProductRow(idx)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center border-2 border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-muted-foreground shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Spreadsheet Footer Add Button */}
                  <div className="p-2 border-t border-border bg-muted/20 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase pl-1">
                      {products.filter(p => p.name.trim() !== "").length} products loaded
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addProductRow}
                      className="h-8 rounded-xl text-[10px] font-black uppercase tracking-wider"
                      style={{ color: primaryColor.hex, borderColor: `${primaryColor.hex}30` }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Item Row
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer wizard controls */}
      <div className="px-8 py-5 border-t border-border/40 flex justify-between items-center bg-card select-none">
        {step > 1 ? (
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-1 border-2"
            disabled={loading}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <Button
            onClick={handleNext}
            className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-1 text-white hover:opacity-90 active:scale-98 transition-all shadow-lg"
            style={{ backgroundColor: primaryColor.hex, boxShadow: `0 10px 15px -3px ${primaryColor.hex}30` }}
            disabled={step === 1 && !storeName.trim()}
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={handleWizardSubmit}
            disabled={loading}
            className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-1.5 text-white hover:opacity-90 active:scale-98 transition-all shadow-lg"
            style={{ backgroundColor: primaryColor.hex, boxShadow: `0 10px 15px -3px ${primaryColor.hex}30` }}
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>Launch OS <Play className="h-3.5 w-3.5 fill-white" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
