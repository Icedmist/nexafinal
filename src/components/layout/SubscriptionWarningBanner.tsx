import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { X, Clock, AlertTriangle, Ban, CreditCard } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useRole } from "@/hooks/useRole";
import { useDemo } from "@/hooks/useDemo";

/**
 * Merchant-facing subscription warning banner.
 *
 * Shows when a store's trial has ended (or is close to ending), the account is
 * past due, or the subscription has been cancelled by the platform. Hidden for
 * demo mode, system admins, and accounts without an explicit status.
 */
export function SubscriptionWarningBanner() {
  const { profile } = useBusiness();
  const { isSystemAdmin } = useRole();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (isDemo || isSystemAdmin || dismissed || !profile) return null;

  const status = profile.subscriptionStatus;
  const trialEndsAt = profile.trialEndsAt ? new Date(profile.trialEndsAt).getTime() : null;
  const now = Date.now();

  // Stores without an explicit subscription status (legacy/premium-migrated) are
  // fully unlocked — never warn them.
  if (!status) return null;

  let variant: "expiring" | "expired" | "past_due" | "cancelled" | null = null;
  let daysLeft = 0;

  if (status === "trialing" && trialEndsAt) {
    daysLeft = Math.ceil((trialEndsAt - now) / 86400000);
    if (daysLeft < 0) variant = "expired";
    else if (daysLeft <= 3) variant = "expiring";
  } else if (status === "past_due") {
    variant = "past_due";
  } else if (status === "cancelled") {
    variant = "cancelled";
  }

  if (!variant) return null;

  const palette: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    expiring: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-300 dark:border-amber-800",
      text: "text-amber-800 dark:text-amber-300",
      icon: <Clock className="h-4 w-4 shrink-0" />,
    },
    expired: {
      bg: "bg-red-50 dark:bg-red-950/40",
      border: "border-red-300 dark:border-red-800",
      text: "text-red-800 dark:text-red-300",
      icon: <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" />,
    },
    past_due: {
      bg: "bg-red-50 dark:bg-red-950/40",
      border: "border-red-300 dark:border-red-800",
      text: "text-red-800 dark:text-red-300",
      icon: <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" />,
    },
    cancelled: {
      bg: "bg-neutral-100 dark:bg-neutral-900",
      border: "border-neutral-300 dark:border-neutral-700",
      text: "text-neutral-700 dark:text-neutral-300",
      icon: <Ban className="h-4 w-4 shrink-0" />,
    },
  };

  const copy = {
    expiring: `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Please make your payment to continue uninterrupted.`,
    expired: "Your free trial has ended. Make your payment to keep full access to your store, or a platform administrator can extend or adjust your tier.",
    past_due: "Your subscription payment is overdue. Please make your payment to avoid service interruption.",
    cancelled: "Your subscription has been cancelled. Your store is running on the free Starter tier. Contact your platform administrator to restore access.",
  };

  const p = palette[variant];

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 ${p.bg} ${p.border}`}>
      <div className={`flex items-center gap-2 text-[11px] font-bold ${p.text}`}>
        {p.icon}
        <span className="leading-snug">{copy[variant]}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/app/settings")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${p.text} hover:opacity-80`}
        >
          <CreditCard className="h-3 w-3" /> Make Payment
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss subscription warning"
          className={`rounded p-1 transition-opacity hover:opacity-70 ${p.text}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
