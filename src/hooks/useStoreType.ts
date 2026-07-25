import { useState, useEffect, useCallback } from "react";
import { useDemo } from "./useDemo";
import { useBusiness } from "@/contexts/BusinessContext";

export type StoreClientType = "retailer" | "wholesaler" | "supermarket";

const LOCAL_STORAGE_KEY = "nexa_store_client_type";

export interface StoreTypeOption {
  id: StoreClientType;
  title: string;
  badge: string;
  tagline: string;
  icon: string;
  color: string;
  bgLight: string;
  borderColor: string;
  features: string[];
}

export const STORE_TYPE_OPTIONS: StoreTypeOption[] = [
  {
    id: "retailer",
    title: "Retailer POS",
    badge: "Retail Shop",
    tagline: "Single unit sales, instant cash change calculator, express receipt print & fast barcode scanning",
    icon: "ShoppingBag",
    color: "text-emerald-600 dark:text-emerald-400",
    bgLight: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30 hover:border-emerald-500",
    features: ["Single-unit quick sale", "Fast change keypad (₦1k, ₦5k, ₦10k)", "Express receipts & WhatsApp", "Barcode scanner POS"]
  },
  {
    id: "wholesaler",
    title: "Wholesale Depot",
    badge: "Bulk & B2B",
    tagline: "Crate, carton & pack unit conversions, B2B customer credit ledger, tiered volume pricing & MOQ warnings",
    icon: "Package",
    color: "text-blue-600 dark:text-blue-400",
    bgLight: "bg-blue-500/10",
    borderColor: "border-blue-500/30 hover:border-blue-500",
    features: ["Carton/Crate volume pricing", "Tiered discount rates (10+ cartons)", "B2B Credit Ledger & terms", "Minimum Order Quantity alerts"]
  },
  {
    id: "supermarket",
    title: "Supermarket / Store",
    badge: "Multi-Aisle & Tills",
    tagline: "Department & aisle navigation, multi-counter till performance tracking, high-velocity scan queue",
    icon: "ShoppingCart",
    color: "text-purple-600 dark:text-purple-400",
    bgLight: "bg-purple-500/10",
    borderColor: "border-purple-500/30 hover:border-purple-500",
    features: ["Aisle & Department filters", "Multi-Counter / Till POS selector", "Express scan queue manager", "Department profit matrices"]
  }
];

export function useStoreType() {
  const { isDemo, onboarding, updateOnboarding } = useDemo();
  const { profile, updateProfile } = useBusiness();

  const activeBusinessType = isDemo ? onboarding?.businessType : profile?.businessType;

  const getInitialStoreType = (): StoreClientType => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as StoreClientType;
      if (saved && ["retailer", "wholesaler", "supermarket"].includes(saved)) {
        return saved;
      }
    }
    if (activeBusinessType === "wholesale") return "wholesaler";
    if (activeBusinessType === "groceries" || activeBusinessType === "supermarket") return "supermarket";
    return "retailer";
  };

  const [storeType, setStoreTypeState] = useState<StoreClientType>(getInitialStoreType);

  const setStoreType = useCallback(
    (type: StoreClientType) => {
      setStoreTypeState(type);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, type);
      }
      
      // Sync with businessType if appropriate
      const mappedBusinessType = type === "wholesaler" ? "wholesale" : type === "supermarket" ? "retail" : "retail";
      if (isDemo) {
        updateOnboarding({ businessType: mappedBusinessType });
      } else if (updateProfile) {
        updateProfile({ businessType: mappedBusinessType });
      }

      // Dispatch custom event for real-time reactivity across components
      window.dispatchEvent(new CustomEvent("nexa-storetype-changed", { detail: type }));
    },
    [isDemo, updateOnboarding, updateProfile]
  );

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvt = e as CustomEvent<StoreClientType>;
      if (customEvt.detail) {
        setStoreTypeState(customEvt.detail);
      }
    };
    window.addEventListener("nexa-storetype-changed", handleEvent);
    return () => window.removeEventListener("nexa-storetype-changed", handleEvent);
  }, []);

  return {
    storeType,
    setStoreType,
    isRetailer: storeType === "retailer",
    isWholesaler: storeType === "wholesaler",
    isSupermarket: storeType === "supermarket",
    currentOption: STORE_TYPE_OPTIONS.find((o) => o.id === storeType) || STORE_TYPE_OPTIONS[0],
    options: STORE_TYPE_OPTIONS,
  };
}
