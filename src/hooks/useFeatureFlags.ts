import { useMemo } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useDemo } from "@/hooks/useDemo";
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
  // Tier & System Admin Flag Overrides
  pricingMode: boolean;
  crossBranchVisibility: boolean;
  b2bMarketplace: boolean;
  maxBranches: number;
  aiAssistant: boolean;
  planName: string;
  planId: string;
  status: string;
}

const DEFAULT_TIER_LIMITS: Record<string, {
  pricingMode: boolean;
  crossBranchVisibility: boolean;
  b2bMarketplace: boolean;
  maxBranches: number;
  aiAssistant: boolean;
  hasEcommerce: boolean;
  hasAffiliates: boolean;
  hasAI: boolean;
  hasTracker: boolean;
}> = {
  starter: {
    pricingMode: false,
    crossBranchVisibility: false,
    b2bMarketplace: false,
    maxBranches: 1,
    aiAssistant: false,
    hasEcommerce: false,
    hasAffiliates: false,
    hasAI: false,
    hasTracker: false,
  },
  professional: {
    pricingMode: true,
    crossBranchVisibility: true,
    b2bMarketplace: false,
    maxBranches: 3,
    aiAssistant: false,
    hasEcommerce: true,
    hasAffiliates: true,
    hasAI: false,
    hasTracker: false,
  },
  enterprise: {
    pricingMode: true,
    crossBranchVisibility: true,
    b2bMarketplace: true,
    maxBranches: 10,
    aiAssistant: true,
    hasEcommerce: true,
    hasAffiliates: true,
    hasAI: true,
    hasTracker: true,
  },
  premium: {
    pricingMode: true,
    crossBranchVisibility: true,
    b2bMarketplace: true,
    maxBranches: 10,
    aiAssistant: true,
    hasEcommerce: true,
    hasAffiliates: true,
    hasAI: true,
    hasTracker: true,
  },
};

export function useFeatureFlags(): { flags: FeatureFlags } {
  const { profile } = useBusiness();
  const { isDemo } = useDemo();
  const sectorConfig = useSector();

  const flags = useMemo(() => {
    const rawTier = (profile?.subscriptionTier || profile?.settings?.planId || "starter").toLowerCase();
    const planId = isDemo ? "professional" : (DEFAULT_TIER_LIMITS[rawTier] ? rawTier : "professional");
    const planName = isDemo
      ? "Pro Plan"
      : (profile?.settings?.planName || planId.charAt(0).toUpperCase() + planId.slice(1) + " Plan");
    const status = isDemo
      ? "active"
      : (profile?.subscriptionStatus || profile?.settings?.subscriptionStatus || "active");

    const tierDefaults = DEFAULT_TIER_LIMITS[planId] || DEFAULT_TIER_LIMITS.professional;
    const adminOverrides = (profile?.featureFlagsOverride as Record<string, any> | undefined) || {};

    // Resolve flags with System Admin overrides taking precedence
    const pricingMode = typeof adminOverrides.pricingMode === "boolean" 
      ? adminOverrides.pricingMode 
      : tierDefaults.pricingMode;

    const crossBranchVisibility = typeof adminOverrides.crossBranchVisibility === "boolean"
      ? adminOverrides.crossBranchVisibility
      : tierDefaults.crossBranchVisibility;

    const b2bMarketplace = typeof adminOverrides.b2bMarketplace === "boolean"
      ? adminOverrides.b2bMarketplace
      : tierDefaults.b2bMarketplace;

    const maxBranches = typeof adminOverrides.maxBranches === "number" && adminOverrides.maxBranches > 0
      ? adminOverrides.maxBranches
      : tierDefaults.maxBranches;

    const aiAssistant = typeof adminOverrides.aiAssistant === "boolean"
      ? adminOverrides.aiAssistant
      : tierDefaults.aiAssistant;

    return {
      hasExpiry: sectorConfig?.features?.hasExpiry ?? false,
      hasBatches: sectorConfig?.features?.hasBatches ?? false,
      hasTableBooking: sectorConfig?.features?.hasTableBooking ?? false,
      hasProduction: sectorConfig?.features?.hasProduction ?? false,
      hasWarranty: sectorConfig?.features?.hasWarranty ?? false,
      isFreshGood: sectorConfig?.features?.isFreshGood ?? false,
      hasEcommerce: tierDefaults.hasEcommerce ?? false,
      hasAffiliates: tierDefaults.hasAffiliates ?? false,
      hasAI: aiAssistant || tierDefaults.hasAI,
      hasTracker: tierDefaults.hasTracker ?? false,
      pricingMode,
      crossBranchVisibility,
      b2bMarketplace,
      maxBranches,
      aiAssistant,
      planName,
      planId,
      status,
    };
  }, [profile, isDemo, sectorConfig]);

  return useMemo(() => ({ flags }), [flags]);
}
