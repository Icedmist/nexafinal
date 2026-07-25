import { useContext } from "react";
import { DemoContext, type DemoContextValue } from "@/contexts/DemoContext";

const DEFAULT_CONTEXT: DemoContextValue = {
  isDemo: false,
  demoStore: null,
  enterDemoMode: () => {},
  exitDemoMode: () => {},
  resetDemoData: () => {},
  bumpVersion: () => {},
  version: 0,
  onboarding: {
    businessType: null,
    categories: [],
    storeName: "My Store",
    storePhone: "",
    storeAddress: "",
    receiptFooter: "Thank you for your patronage!",
    taxRate: 0,
    currency: "NGN",
    country: "Nigeria",
    state: "",
    lga: "",
  },
  updateOnboarding: () => {},
};

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) {
    return DEFAULT_CONTEXT;
  }
  return context;
}
