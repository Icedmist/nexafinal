import { useMemo } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useDemo } from "@/hooks/useDemo";
import { getSectorConfig } from "@/constants/sectors";
import { useSector } from "@/hooks/useSector";

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

const PLAN_FLAGS: Record<string, Partial<FeatureFlags>> = {
  starter: {
    hasEcommerce: false,
    hasAffiliates: false,
    hasAI: false,
    hasTracker: false,
  },
  professional: {
    hasEcommerce: true,
    hasAffiliates: true,
    hasAI: false,
    hasTracker: false,
  },
  enterprise: {
    hasEcommerce: true,
    hasAffiliates: true,
    hasAI: true,
    hasTracker: true,
  },
};

export function useFeatureFlags(): { flags: FeatureFlags } {
  const { profile } = useBusiness();
  const { isDemo } = useDemo();
  const { config: sectorConfig } = useSector();

  const flags = useMemo(() => {
    const planId = isDemo ? "professional" : (profile?.settings?.planId || profile?.subscriptionTier || "starter");
    const planName = isDemo ? "Pro Plan" : (profile?.settings?.planName || profile?.subscriptionTier || "Starter");
    const status = isDemo ? "active" : (profile?.settings?.subscriptionStatus || profile?.subscriptionStatus || "active");

    const planOverrides = PLAN_FLAGS[planId] || PLAN_FLAGS.starter;

    return {
      hasExpiry: sectorConfig?.features?.hasExpiry ?? false,
      hasBatches: sectorConfig?.features?.hasBatches ?? false,
      hasTableBooking: sectorConfig?.features?.hasTableBooking ?? false,
      hasProduction: sectorConfig?.features?.hasProduction ?? false,
      hasWarranty: sectorConfig?.features?.hasWarranty ?? false,
      isFreshGood: sectorConfig?.features?.isFreshGood ?? false,
      hasEcommerce: planOverrides.hasEcommerce ?? false,
      hasAffiliates: planOverrides.hasAffiliates ?? false,
      hasAI: planOverrides.hasAI ?? false,
      hasTracker: planOverrides.hasTracker ?? false,
      planName,
      planId,
      status,
    };
  }, [profile, isDemo, sectorConfig]);

  return useMemo(() => ({ flags }), [flags]);
}
