import React, { useState } from "react";
import { AlertTriangle, Clock, ShieldAlert, Sparkles, X, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { PaymentDialog } from "@/components/settings/PaymentDialog";

export function SubscriptionWarningBanner() {
  const { profile } = useBusiness();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [targetTier, setTargetTier] = useState<"starter" | "professional" | "enterprise">("professional");
  const [dismissed, setDismissed] = useState(false);

  if (!profile || dismissed) return null;

  const subscriptionStatus = profile.subscriptionStatus || profile.settings?.subscriptionStatus || "trialing";
  const subscriptionTier = profile.subscriptionTier || profile.settings?.planId || "starter";
  const currentPeriodEnd = profile.currentPeriodEnd || profile.settings?.currentPeriodEnd;
  const trialEndsAt = profile.trialEndsAt || profile.settings?.trialEndsAt;
  const latePaymentWarning = (profile as any)?.latePaymentWarning;

  const now = new Date().getTime();
  const periodEndMs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : 0;
  const trialEndMs = trialEndsAt ? new Date(trialEndsAt).getTime() : 0;

  const isPastDue = subscriptionStatus === "past_due" || (subscriptionStatus === "active" && periodEndMs > 0 && periodEndMs < now);
  const isTrialExpired = subscriptionStatus === "trialing" && trialEndMs > 0 && trialEndMs < now;
  const isTrialExpiringSoon = subscriptionStatus === "trialing" && trialEndMs > 0 && (trialEndMs - now) < 3 * 24 * 60 * 60 * 1000 && trialEndMs > now;
  
  const hasCustomWarning = !!latePaymentWarning?.message;

  if (!isPastDue && !isTrialExpired && !isTrialExpiringSoon && !hasCustomWarning) {
    return null;
  }

  // Determine banner theme and copy
  let bgClass = "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200";
  let icon = <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  let title = "Subscription Notice";
  let message = "";
  let urgent = false;

  if (hasCustomWarning) {
    const severity = latePaymentWarning.severity || "warning";
    message = latePaymentWarning.message;
    if (severity === "critical" || severity === "lockout") {
      bgClass = "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200";
      icon = severity === "lockout" ? <Lock className="h-4 w-4 text-red-500 shrink-0 animate-bounce" /> : <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />;
      title = severity === "lockout" ? "⚠️ Urgent Grace Period Notice" : "🚨 Important Billing Alert";
      urgent = true;
    }
  } else if (isPastDue) {
    bgClass = "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200";
    icon = <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 animate-pulse" />;
    title = "Subscription Overdue";
    message = `Your ${subscriptionTier.toUpperCase()} subscription expired on ${periodEndMs ? new Date(periodEndMs).toLocaleDateString() : "recently"}. Please renew to prevent store feature limitations.`;
    urgent = true;
  } else if (isTrialExpired) {
    bgClass = "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200";
    icon = <Clock className="h-4 w-4 text-red-500 shrink-0" />;
    title = "14-Day Free Trial Ended";
    message = "Your trial period has concluded. Choose a plan with Paystack to unlock live store operations.";
    urgent = true;
  } else if (isTrialExpiringSoon) {
    const daysLeft = Math.max(1, Math.ceil((trialEndMs - now) / (24 * 60 * 60 * 1000)));
    title = `Trial Ending in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}`;
    message = `Your free trial concludes on ${new Date(trialEndMs).toLocaleDateString()}. Subscribe today with Paystack to keep your products and branch data active.`;
  }

  const handleOpenPaystack = () => {
    const validTier = (subscriptionTier === "enterprise" ? "enterprise" : subscriptionTier === "starter" ? "starter" : "professional") as "starter" | "professional" | "enterprise";
    setTargetTier(validTier);
    setPaymentOpen(true);
  };

  return (
    <>
      <div className={`w-full border-b px-4 py-2.5 flex items-center justify-between gap-3 text-xs shadow-sm transition-all ${bgClass}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {icon}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 truncate">
            <span className="font-bold tracking-tight">{title}:</span>
            <span className="text-[11px] opacity-90 truncate">{message}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleOpenPaystack}
            className={`h-7 px-3 text-xs font-bold text-white gap-1.5 shadow-sm ${
              urgent ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pay with Paystack</span>
            <ArrowRight className="h-3 w-3" />
          </Button>

          {!urgent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(true)}
              className="h-6 w-6 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        targetTier={targetTier}
      />
    </>
  );
}
