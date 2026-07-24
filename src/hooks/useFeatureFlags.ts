import { useMemo } from "react";
import { useBusiness } from "@/contexts/BusinessContext";

export interface FeatureFlags {
  hasExpiry: boolean;
  hasBatches: boolean;
  hasTableBooking: boolean;
  hasProduction: boolean;
  hasWarranty: boolean;
  isFreshGood: boolean;
  hasEcommerce: boolean;
  hasAffiliates: boolean;
  hasAI: boolean;
  hasTracker: boolean;
  planName: string;
  planId: string;
  status: string;
}

const DEFAULT_FLAGS: FeatureFlags = {
  hasExpiry: false,
  hasBatches: false,
  hasTableBooking: false,
  hasProduction: false,
  hasWarranty: false,
  isFreshGood: false,
  hasEcommerce: true,
  hasAffiliates: true,
  hasAI: true,
  hasTracker: true,
  planName: "free",
  planId: "free",
  status: "active",
};

export function useFeatureFlags(): { flags: FeatureFlags } {
  const { profile } = useBusiness();
  
  const flags = useMemo(() => {
    // In v2, feature flags come from the business profile's plan/subscription
    // For now, return default flags with plan info
    return {
      ...DEFAULT_FLAGS,
      planName: profile?.settings?.planName || "free",
      planId: profile?.settings?.planId || "free",
      status: profile?.settings?.subscriptionStatus || "active",
    };
  }, [profile]);
  
  return useMemo(() => ({ flags }), [flags]);
}
