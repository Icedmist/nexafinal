import { Package, ShoppingCart, ClipboardList, AlertTriangle, Info, X, LogIn, UserPlus, Receipt, ArrowRightLeft } from "lucide-react";
import type { NotificationType } from "@/types/inventory";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  low_stock: { icon: <Package className="h-4 w-4" />, color: "text-amber-500" },
  zero_stock: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-destructive" },
  po_reminder: { icon: <ShoppingCart className="h-4 w-4" />, color: "text-blue-500" },
  po_overdue: { icon: <ShoppingCart className="h-4 w-4" />, color: "text-destructive" },
  request_update: { icon: <ClipboardList className="h-4 w-4" />, color: "text-primary" },
  inventory_request: { icon: <ClipboardList className="h-4 w-4" />, color: "text-primary" },
  system: { icon: <Info className="h-4 w-4" />, color: "text-muted-foreground" },
  login: { icon: <LogIn className="h-4 w-4" />, color: "text-emerald-500" },
  staff_onboarding: { icon: <UserPlus className="h-4 w-4" />, color: "text-violet-500" },
  sale: { icon: <Receipt className="h-4 w-4" />, color: "text-emerald-500" },
  movement: { icon: <ArrowRightLeft className="h-4 w-4" />, color: "text-blue-500" },
};

export function getNotificationIcon(type: NotificationType) {
  const entry = ICON_MAP[type] ?? ICON_MAP.system;
  return <span className={cn("shrink-0", entry.color)}>{entry.icon}</span>;
}

export { X };
