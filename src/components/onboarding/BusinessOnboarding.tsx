import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  UtensilsCrossed,
  Warehouse,
  Package,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  MapPin,
  Phone,
  LayoutTemplate
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AuthStep } from "./AuthStep";
import { createUserProfile } from "@/lib/firebase";
import { toast } from "sonner";

const BUSINESS_TYPES = [
  { id: "retail", label: "Retail / POS", icon: Store, description: "Physical store selling to customers" },
  { id: "restaurant", label: "Restaurant / Food", icon: UtensilsCrossed, description: "Food service with menu items" },
  { id: "wholesale", label: "Wholesale", icon: Warehouse, description: "Bulk sales to other businesses" },
  { id: "general", label: "General Inventory", icon: Package, description: "Flexible for any business" },
] as const;

const CATEGORY_MAP: Record<string, { id: string; label: string; emoji: string }[]> = {
  retail: [
    { id: "electronics", label: "Electronics", emoji: "📱" },
    { id: "fashion", label: "Fashion & Clothing", emoji: "👕" },
    { id: "groceries", label: "Groceries", emoji: "🛒" },
    { id: "beauty", label: "Beauty & Health", emoji: "💄" },
    { id: "home", label: "Home & Living", emoji: "🏠" },
    { id: "sports", label: "Sports & Fitness", emoji: "⚽" },
  ],
  restaurant: [
    { id: "proteins", label: "Proteins & Meat", emoji: "🥩" },
    { id: "grains", label: "Grains & Staples", emoji: "🍚" },
    { id: "vegetables", label: "Vegetables & Fruits", emoji: "🥬" },
    { id: "drinks", label: "Drinks & Beverages", emoji: "🥤" },
    { id: "spices", label: "Spices & Seasonings", emoji: "🌶️" },
    { id: "bakery", label: "Bakery & Pastry", emoji: "🍞" },
  ],
  wholesale: [
    { id: "fmcg", label: "FMCG", emoji: "📦" },
    { id: "building", label: "Building Materials", emoji: "🧱" },
    { id: "agro", label: "Agro & Farm", emoji: "🌾" },
    { id: "industrial", label: "Industrial Supplies", emoji: "⚙️" },
    { id: "textiles", label: "Textiles", emoji: "🧵" },
    { id: "chemicals", label: "Chemicals", emoji: "🧪" },
  ],
  general: [
    { id: "office", label: "Office Supplies", emoji: "📎" },
    { id: "tools", label: "Tools & Hardware", emoji: "🔧" },
    { id: "it", label: "IT & Equipment", emoji: "💻" },
    { id: "medical", label: "Medical Supplies", emoji: "🏥" },
    { id: "cleaning", label: "Cleaning Products", emoji: "🧹" },
    { id: "misc", label: "Miscellaneous", emoji: "📋" },
  ],
};

const COMPLEXITY_LEVELS = [
  { id: "basic", label: "Basic POS & Inventory", icon: Store, description: "Simplified UI. Perfect for ringing up sales and tracking stock." },
  { id: "full", label: "Full Command Center", icon: Building2, description: "Advanced ERP features including Suppliers, Purchase Orders, and Analytics." },
] as const;

interface BusinessOnboardingProps {
  onComplete: (businessType: string, categories: string[], storeName: string) => void;
  onSkip: () => void;
}

export function BusinessOnboarding({ onComplete, onSkip }: BusinessOnboardingProps) {
  // -1 = Auth
  // 0 = Business Details
  // 1 = Business Type
  // 2 = Categories
  // 3 = Complexity Level
  const [step, setStep] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);

  // Auth User
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");

  // Business Details
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Business Profile
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Complexity
  const [complexity, setComplexity] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAuthSuccess = (newUid: string, newEmail: string) => {
    setUid(newUid);
    setEmail(newEmail);
    setStep(0);
  };

  const handleNext = () => {
    if (step === 0 && storeName.trim()) setStep(1);
    else if (step === 1 && selectedBusiness) {
      setStep(2);
      setSelectedCategories(new Set());
    }
    else if (step === 2 && selectedCategories.size > 0) setStep(3);
  };

  const handleFinish = async () => {
    if (!complexity) return;
    
    setIsSaving(true);
    try {
      await createUserProfile(uid, {
        email,
        storeDetails: {
          name: storeName.trim() || "My Store",
          phone: phone.trim(),
          address: address.trim(),
        },
        businessType: selectedBusiness,
        categories: Array.from(selectedCategories),
        complexityLevel: complexity,
        createdAt: new Date().toISOString(),
      });
      
      onComplete(
        selectedBusiness || "general",
        Array.from(selectedCategories),
        storeName.trim() || "My Store"
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const categories = selectedBusiness ? CATEGORY_MAP[selectedBusiness] ?? [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8"
      >
        {/* Progress (hide on Auth step) */}
        {step >= 0 && (
          <div className="mb-6 flex items-center gap-2">
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 0 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 1 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 3 ? "bg-primary" : "bg-muted")} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === -1 && (
            <AuthStep onSuccess={handleAuthSuccess} />
          )}

          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Business Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">Let's get your store set up.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name" className="text-sm font-medium">Store / Business Name *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Business Phone (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 ..."
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Business Address (Optional)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, City"
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
                  Skip for now
                </button>
                <Button onClick={handleNext} disabled={!storeName.trim()} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">What type of business do you run?</h2>
                <p className="mt-1 text-sm text-muted-foreground">This helps us set up the right categories for you.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <Button variant="ghost" onClick={() => setStep(0)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={!selectedBusiness} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Select your product categories</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick the ones that match your inventory. You can change these later.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-sm font-medium">{cat.label}</span>
                    {selectedCategories.has(cat.id) && <Check className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={selectedCategories.size === 0} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Choose your Workspace Style</h2>
                <p className="mt-1 text-sm text-muted-foreground">Do you just need a simple POS, or the full ERP suite?</p>
              </div>

              <div className="space-y-3">
                {COMPLEXITY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setComplexity(level.id)}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
                      complexity === level.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className={cn("rounded-lg p-2.5", complexity === level.id ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                      <level.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <span className="block font-semibold">{level.label}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{level.description}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5" disabled={isSaving}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleFinish} disabled={!complexity || isSaving} className="gap-1.5">
                  {isSaving ? "Saving..." : "Go to Dashboard"} <LayoutTemplate className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
