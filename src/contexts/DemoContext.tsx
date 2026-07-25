import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

export interface OnboardingSelection {
  businessType: string | null;
  categories: string[];
  storeName: string;
  storePhone: string;
  storeAddress: string;
  receiptFooter: string;
  taxRate: number;
  brandColor?: string;
  logoUrl?: string;
  initialItems?: Array<{ 
    name: string; 
    price: string; 
    stock: string; 
    unit: string; 
    categoryId?: string;
    color?: string;
    sizes?: string;
    enableColours?: boolean;
    enableSizes?: boolean;
    fineTunedVariants?: Record<string, { price: number; stock: number }>;
  }>;
  currency?: string;
  country?: string;
  state?: string;
  lga?: string;
}

const DEFAULT_ONBOARDING: OnboardingSelection = { 
  businessType: null, 
  categories: [], 
  storeName: "My Store", 
  storePhone: "", 
  storeAddress: "", 
  receiptFooter: "Thank you for your patronage!", 
  taxRate: 0, 
  brandColor: "#0d9488", 
  logoUrl: "", 
  currency: "NGN", 
  country: "Nigeria", 
  state: "", 
  lga: "" 
};

export interface DemoContextValue {
  isDemo: boolean;
  demoStore: null;
  enterDemoMode: (onboarding?: OnboardingSelection) => void;
  exitDemoMode: () => void;
  resetDemoData: () => void;
  bumpVersion: () => void;
  version: number;
  onboarding: OnboardingSelection;
  updateOnboarding: (updates: Partial<OnboardingSelection>) => void;
}

export const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);
  const [version, setVersion] = useState(0);
  const [onboarding, setOnboarding] = useState<OnboardingSelection>(DEFAULT_ONBOARDING);

  const enterDemoMode = useCallback((ob?: OnboardingSelection) => {
    setIsDemo(true);
    setVersion(0);
    setOnboarding(ob ?? DEFAULT_ONBOARDING);
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemo(false);
    setVersion(0);
    setOnboarding(DEFAULT_ONBOARDING);
  }, []);

  const resetDemoData = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const bumpVersion = useCallback(() => setVersion((v) => v + 1), []);

  const updateOnboarding = useCallback((updates: Partial<OnboardingSelection>) => {
    setOnboarding((prev) => {
      const next = { ...prev, ...updates };
      if (updates.businessType && updates.businessType !== prev.businessType) {
        let cats: string[] = [];
        if (updates.businessType === "pharmacy") cats = ["office", "tools", "it", "medical", "cleaning", "misc"];
        else if (updates.businessType === "restaurant") cats = ["proteins", "grains", "vegetables", "drinks", "spices", "bakery"];
        else if (updates.businessType === "electronics") cats = ["office", "tools", "it", "medical", "cleaning", "misc"];
        else if (updates.businessType === "agriculture") cats = ["grains_bulk", "tubers", "livestock", "seeds", "fertilizers", "tools_agri"];
        else if (updates.businessType === "retail") cats = ["electronics", "fashion", "groceries", "beauty", "home", "sports"];
        else if (updates.businessType === "textile") cats = ["cotton", "laces", "silk", "sewing", "traditional", "prints"];
        else if (updates.businessType === "wholesale") cats = ["fmcg", "building", "agro", "industrial", "textiles", "chemicals"];
        else cats = ["office", "tools", "it", "medical", "cleaning", "misc"];
        
        next.categories = cats;
      }
      return next;
    });
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      isDemo,
      demoStore: null,
      enterDemoMode,
      exitDemoMode,
      resetDemoData,
      bumpVersion,
      version,
      onboarding,
      updateOnboarding,
    }),
    [isDemo, enterDemoMode, exitDemoMode, resetDemoData, bumpVersion, version, onboarding, updateOnboarding],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
