import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { toast } from "sonner";

export type OnboardingEntryMethod = "camera" | "manual" | "skip" | "excel";

export interface OnboardingCompleteData {
  businessType: string;
  categories: string[];
  storeName: string;
  brandColor: string;
  moniepointKey?: string;
  storeSlug?: string;
  electronicsMainType?: "devices" | "accessories" | "both";
  textilePrimarilySellsBy?: "yard" | "roll" | "both";
  textileSubcategories?: { id: string; label: string; emoji: string; supportedUnits?: string[] }[];
  boutiqueSubcategories?: { id: string; label: string; emoji: string; supportedUnits?: string[] }[];
  initialItems?: Array<{
    name: string;
    price: string;
    costPrice?: string;
    stock: string;
    unit: string;
    categoryId?: string;
    color?: string;
    sizes?: string;
    enableColours?: boolean;
    enableSizes?: boolean;
    fineTunedVariants?: Record<string, { price: number; stock: number }>;
  }>;
  country?: string;
  state?: string;
  lga?: string;
  selectedPlan?: "starter" | "professional" | "enterprise";
  entryMethod?: OnboardingEntryMethod;
}

/**
 * Hook to manage onboarding navigation state & option routing cleanly
 * preventing reload errors and infinite redirects.
 */
export function useOnboardingNavigation() {
  const navigate = useNavigate();

  const handleOptionRoute = useCallback((entryMethod?: OnboardingEntryMethod) => {
    try {
      if (entryMethod === "camera") {
        sessionStorage.setItem("nexa_open_scanner_after_onboarding", "true");
        toast.info("Onboarding complete! Opening camera barcode scanner...");
        navigate("/app/catalog");
      } else if (entryMethod === "excel") {
        sessionStorage.setItem("nexa_open_import_after_onboarding", "true");
        toast.info("Onboarding complete! Opening spreadsheet importer...");
        navigate("/app/catalog");
      } else if (entryMethod === "skip") {
        toast.success("Welcome to Nexa! Ready for quick sales.");
        navigate("/app/sales");
      } else if (entryMethod === "manual") {
        toast.success("Store setup complete! Products added to catalog.");
        navigate("/app/catalog");
      } else {
        toast.success("Welcome to your store dashboard!");
        navigate("/app/dashboard");
      }
    } catch (err) {
      console.error("[useOnboardingNavigation] Router error during option navigation:", err);
      try {
        navigate("/app/dashboard");
      } catch (fallbackErr) {
        console.error("[useOnboardingNavigation] Fallback navigation failed:", fallbackErr);
      }
    }
  }, [navigate]);

  return {
    handleOptionRoute,
  };
}
