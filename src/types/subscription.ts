export interface FeatureFlags {
  pricingMode: boolean; // true = tiered pricing allowed, false = single only
  crossBranchVisibility: boolean; // true = visible across all branches
  b2bMarketplace: boolean; // true = B2B catalog active
  maxBranches: number; // e.g., 1, 3, 10
  aiAssistant?: boolean; // true = Enterprise AI Assistant active
}

export interface SubscriptionPlan {
  planId: string;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  featureFlags: FeatureFlags;
  isActive: boolean;
  sortOrder: number;
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";

export interface StoreSubscriptionDetails {
  subscriptionTier: string; // e.g., "starter", "professional", "enterprise"
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string; // ISO date-time
  trialEndsAt: string | null; // ISO date-time
  paymentMethodOnFile: boolean;
  dunningContactedAt?: string | null; // ISO date-time of last dunning contact
}

export type SubscriptionEventType =
  | "upgrade"
  | "downgrade"
  | "manual_override"
  | "cancellation"
  | "failed_payment"
  | "reactivation"
  | "trial_extension"
  | "discount_apply"
  | "dunning_contact";

export interface SubscriptionEvent {
  id: string;
  storeId: string;
  eventType: SubscriptionEventType;
  fromPlan: string;
  toPlan: string;
  actorId: string; // admin user ID, or "system"
  timestamp: string; // ISO date-time string
  reason?: string;
}
