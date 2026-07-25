import { doc, getDoc, Firestore } from "firebase/firestore";
import type { SubscriptionPlan, FeatureFlags } from "@/types/subscription";

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    planId: "starter",
    name: "Starter Plan",
    price: 3500,
    billingCycle: "monthly",
    isActive: true,
    sortOrder: 1,
    featureFlags: {
      pricingMode: false,
      crossBranchVisibility: false,
      b2bMarketplace: false,
      maxBranches: 1,
      aiAssistant: false
    }
  },
  {
    planId: "professional",
    name: "Pro Plan",
    price: 6500,
    billingCycle: "monthly",
    isActive: true,
    sortOrder: 2,
    featureFlags: {
      pricingMode: true,
      crossBranchVisibility: true,
      b2bMarketplace: false,
      maxBranches: 3,
      aiAssistant: false
    }
  },
  {
    planId: "enterprise",
    name: "Enterprise Plan",
    price: 45000,
    billingCycle: "monthly",
    isActive: true,
    sortOrder: 3,
    featureFlags: {
      pricingMode: true,
      crossBranchVisibility: true,
      b2bMarketplace: true,
      maxBranches: 10,
      aiAssistant: true
    }
  }
];

export async function resolveFeatureFlags(
  db: Firestore,
  storeId: string,
  allPlans?: SubscriptionPlan[]
): Promise<FeatureFlags & { planName: string; planId: string; status: string }> {
  try {
    const storeRef = doc(db, "stores", storeId);
    const storeSnap = await getDoc(storeRef);
    
    let tier = "starter";
    let status = "trialing";
    
    if (storeSnap.exists()) {
      const storeData = storeSnap.data();
      if (storeData.subscriptionTier) {
        tier = storeData.subscriptionTier;
      }
      if (storeData.subscriptionStatus) {
        status = storeData.subscriptionStatus;
      }
    }
    
    // If cancelled, degrade to starter plan flags immediately
    if (status === "cancelled") {
      tier = "starter";
    }
    
    // Find plan in passed list, or fetch from DB, or fallback to DEFAULT_PLANS
    let plan = allPlans?.find(p => p.planId === tier);
    
    if (!plan) {
      try {
        const planRef = doc(db, "subscriptionPlans", tier);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          plan = planSnap.data() as SubscriptionPlan;
        }
      } catch (e) {
        console.warn("Failed to fetch plan from Firestore, using default fallback", e);
      }
    }
    
    const resolvedPlan = plan || DEFAULT_PLANS.find(p => p.planId === tier) || DEFAULT_PLANS[0];
    const storeData = storeSnap.exists() ? storeSnap.data() : null;
    const overrides = storeData?.featureFlagsOverride || {};
    
    return {
      ...resolvedPlan.featureFlags,
      ...overrides,
      planName: resolvedPlan.name,
      planId: resolvedPlan.planId,
      status: status
    };
  } catch (err) {
    console.error("Error resolving feature flags:", err);
    return {
      pricingMode: false,
      crossBranchVisibility: false,
      b2bMarketplace: false,
      maxBranches: 1,
      aiAssistant: false,
      planName: "Starter Plan",
      planId: "starter",
      status: "trialing"
    };
  }
}

interface StoreBillingData {
  subscriptionTier?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string | null;
  paymentMethodOnFile?: boolean;
  featureFlagsOverride?: Partial<FeatureFlags>;
}

export function resolveFeatureFlagsSync(
  storeData: StoreBillingData | null | undefined,
  allPlans: SubscriptionPlan[] = DEFAULT_PLANS
): FeatureFlags & { planName: string; planId: string; status: string } {
  let tier = storeData?.subscriptionTier || "starter";
  const status = storeData?.subscriptionStatus || "trialing";
  
  if (status === "cancelled") {
    tier = "starter";
  }
  
  const plan = allPlans.find(p => p.planId === tier) || DEFAULT_PLANS.find(p => p.planId === tier) || DEFAULT_PLANS[0];
  const baseFlags = plan.featureFlags;
  const overrides = storeData?.featureFlagsOverride || {};

  return {
    ...baseFlags,
    ...overrides,
    planName: plan.name,
    planId: plan.planId,
    status: status
  };
}
