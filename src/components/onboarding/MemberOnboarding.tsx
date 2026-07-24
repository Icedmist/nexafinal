import { motion } from "framer-motion";
import {
  Users,
  ShieldCheck,
  Shield,
  User as UserIcon,
  ArrowRight,
  Package,
  ShoppingCart,
  MessageSquare,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemberOnboardingProps {
  name: string;
  role: string;
  onComplete: () => void;
}

const ROLE_INFO: Record<string, { title: string; desc: string; icon: LucideIcon; color: string }> = {
  admin: { title: "Store Administrator", desc: "You have full control over the store, settings, and team management.", icon: ShieldCheck, color: "text-teal-600 bg-teal-50" },
  manager: { title: "Inventory Manager", desc: "You can manage stock, process purchase orders, and view analytics.", icon: Shield, color: "text-amber-600 bg-amber-50" },
  requestor: { title: "Store Requestor", desc: "You can view the catalog and create requests for stock movements.", icon: UserIcon, color: "text-blue-600 bg-blue-50" },
  staff: { title: "Store Staff", desc: "You can log sales and view inventory levels.", icon: UserIcon, color: "text-gray-600 bg-gray-50" },
};

const STEPS = [
  { icon: Package, title: "Browse Catalog", desc: "View all items and check their current stock levels." },
  { icon: ShoppingCart, title: "Create Requests", desc: "Submit orders or requests for approval by managers." },
  { icon: MessageSquare, title: "Collaborate", desc: "Add notes to movements and stay in sync with your team." }
];

export function MemberOnboarding({ name, role, onComplete }: MemberOnboardingProps) {
  const info = ROLE_INFO[role] || ROLE_INFO.requestor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-xl"
      >
        <div className="text-center space-y-2 mb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome, {name}!</h2>
          <p className="text-muted-foreground">You've been added to the store command center.</p>
        </div>

        <div className={cn("rounded-xl border p-4 mb-8 flex items-start gap-4", info.color.split(" ")[1])}>
          <div className={cn("p-2 rounded-lg", info.color.split(" ")[0], "bg-white shadow-sm")}>
            <info.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{info.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{info.desc}</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">What you can do</h4>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              className="flex items-center gap-3 p-2 group"
            >
              <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                <step.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <Button onClick={onComplete} className="w-full h-12 text-base font-semibold gap-2">
          Get Started <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-[11px] text-center text-muted-foreground mt-4">
          By continuing, you agree to follow the store's inventory policies.
        </p>
      </motion.div>
    </div>
  );
}
