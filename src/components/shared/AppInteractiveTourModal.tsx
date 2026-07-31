import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ComponentType } from "react";
import { useDemo } from "@/hooks/useDemo";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  Truck,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  X,
  Play,
} from "lucide-react";

export interface TourStep {
  id: string;
  title: string;
  category: string;
  icon: ComponentType<{ className?: string }>;
  badge: string;
  description: string;
  keyFeatures: string[];
  routePath?: string;
  highlightTip: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    title: "Multi-Branch Operations & Real-Time Dashboard",
    category: "Store Oversight",
    icon: Store,
    badge: "Step 1 of 6",
    description:
      "Seamlessly manage single or multi-branch enterprise stores. Monitor overall valuation, revenue, low stock alerts, and team activity logs in real-time.",
    keyFeatures: [
      "1-Click Branch Switcher in the top header",
      "Live sales overview and top-selling product statistics",
      "Automated stock level warnings & low stock threshold alerts",
    ],
    routePath: "/app/dashboard",
    highlightTip: "Tip: Use the top store dropdown to view consolidated metrics across branches.",
  },
  {
    id: "catalog",
    title: "Inventory Catalog & Custom Pricing Rules",
    category: "Product Management",
    icon: Package,
    badge: "Step 2 of 6",
    description:
      "Maintain your entire product master list. Track cost prices, wholesale/retail prices, barcodes, categories, and custom attributes.",
    keyFeatures: [
      "Barcode scanning and custom SKU generation",
      "Single and Tiered pricing modes for bulk buyers",
      "Custom product fields tailored to your industry",
    ],
    routePath: "/app/catalog",
    highlightTip: "Tip: Click on any item to view historical stock movements and pricing history.",
  },
  {
    id: "movements",
    title: "Stock Movements & Branch Manager Payment Debts",
    category: "Logistics & Debt Tracking",
    icon: ArrowRightLeft,
    badge: "Step 3 of 6",
    description:
      "Track every item issued or received across store branches. Store managers can record payments made for goods and track remaining debt balances in movement history.",
    keyFeatures: [
      "Log Received, Shipped, Transferred, or Adjusted goods",
      "Track manager payments made against total movement value",
      "Automatic calculation of pending debt balances and remaining balances",
    ],
    routePath: "/app/movements",
    highlightTip: "Tip: All movement debts automatically sync with store audit records for full transparency.",
  },
  {
    id: "pos",
    title: "Point of Sale (POS) & Customer Credit Sales",
    category: "Cashier Checkout",
    icon: ShoppingCart,
    badge: "Step 4 of 6",
    description:
      "Fast cashier checkout with instant barcode scanning, multiple payment methods (Cash, Card, Transfer), credit sales, and receipts.",
    keyFeatures: [
      "Barcode reader integration & fast item search",
      "Record credit sales with customer debt ledgers",
      "Generate digital, thermal, or A4 PDF invoices",
    ],
    routePath: "/app/sales",
    highlightTip: "Tip: Hold Ctrl+K or tap Search anytime to perform quick product price checks.",
  },
  {
    id: "purchase_orders",
    title: "Purchase Orders, Suppliers & Automated Reorder",
    category: "Supply Chain",
    icon: Truck,
    badge: "Step 5 of 6",
    description:
      "Automate reorders when items hit safety thresholds. Manage supplier contact scorecards and track incoming stock shipments.",
    keyFeatures: [
      "1-Click Purchase Order generation based on reorder points",
      "Track purchase order status (Draft, Sent, Received, Paid)",
      "Supplier scorecards & performance metrics",
    ],
    routePath: "/app/purchase-orders",
    highlightTip: "Tip: Approved purchase orders auto-adjust stock quantities upon receiving.",
  },
  {
    id: "admin_help",
    title: "Super Admin Desk & PDF User Manuals",
    category: "System Settings",
    icon: ShieldCheck,
    badge: "Step 6 of 6",
    description:
      "Manage staff access, subscription tiers, and system policies. Super Admins can upload official PDF User Manuals that reflect live in the Help Portal.",
    keyFeatures: [
      "Granular role permissions (Super Admin, Admin, Manager)",
      "Upload & sync official system PDF operating manuals",
      "Generate 12-hour field demo passes for device inspection",
    ],
    routePath: "/app/help",
    highlightTip: "Tip: Access the Help & Agent Portal anytime from the sidebar menu.",
  },
];

interface AppInteractiveTourModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStepIndex?: number;
}

export function AppInteractiveTourModal({
  open,
  onOpenChange,
  initialStepIndex = 0,
}: AppInteractiveTourModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialStepIndex);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const navigate = useNavigate();
  const { enterDemoMode } = useDemo();

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialStepIndex);
    }
  }, [open, initialStepIndex]);

  const currentStep = TOUR_STEPS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === TOUR_STEPS.length - 1;

  const handleActivateDemoOnboarding = () => {
    enterDemoMode();
    toast.success("Interactive Demo Mode Launched! Preloaded with multi-branch products and sales.");
    if (dontShowAgain) {
      localStorage.setItem("nexa_interactive_tour_completed", "true");
    }
    onOpenChange(false);
    navigate("/app/dashboard");
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem("nexa_interactive_tour_completed", "true");
    }
    onOpenChange(false);
  };

  const handleNavigateStepRoute = () => {
    if (currentStep.routePath) {
      navigate(currentStep.routePath);
      onOpenChange(false);
    }
  };

  const IconComponent = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border border-border p-0 overflow-hidden shadow-2xl">
        {/* Header Banner */}
        <div className="bg-primary/10 border-b border-primary/20 p-6 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-md">
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold uppercase">
                    {currentStep.category}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{currentStep.badge}</span>
                </div>
                <DialogTitle className="text-xl font-bold font-sans text-foreground mt-0.5">
                  {currentStep.title}
                </DialogTitle>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full opacity-70 hover:opacity-100"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 w-full bg-primary/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-5">
          <DialogDescription className="text-sm text-foreground leading-relaxed">
            {currentStep.description}
          </DialogDescription>

          {/* Key Capabilities Bullet Points */}
          <div className="space-y-2.5 p-4 rounded-xl bg-muted/50 border border-border">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
              Key Workflow Features:
            </span>
            <ul className="space-y-2">
              {currentStep.keyFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro-Tip Box */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span>{currentStep.highlightTip}</span>
          </div>

          {/* Onboarding Demo Banner on Final Tour Step */}
          {isLast && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-emerald-500/15 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />
                <span>Onboarding Next Step: Ready to Test Drive in Demo Mode?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Launch an isolated Demo Sandbox preloaded with sample products, transactions, and manager movement debts for hands-on practice.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="text-xs h-8 font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm"
                  onClick={handleActivateDemoOnboarding}
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Activate Demo Sandbox Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 font-semibold text-foreground border-border"
                  onClick={handleComplete}
                >
                  Continue to Live Store
                </Button>
              </div>
            </div>
          )}

          {/* Quick Route Link */}
          {currentStep.routePath && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">Want to explore this page now?</span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
                onClick={handleNavigateStepRoute}
              >
                Go to {currentStep.title.split("&")[0]} Page
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-muted/30 border-t border-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Don't show interactive tour on startup</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="text-xs h-9 font-semibold gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleNext}
              className="text-xs h-9 font-bold bg-primary hover:bg-primary/95 text-primary-foreground gap-1.5 shadow-sm"
            >
              {isLast ? "Complete Tour" : "Next Step"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
