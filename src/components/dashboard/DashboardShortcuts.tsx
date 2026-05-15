import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, 
  PlusCircle, 
  Receipt, 
  Users, 
  Truck, 
  History,
  Barcode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/hooks/usePermissions";

interface ShortcutProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color: string;
  permission?: string;
}

function Shortcut({ icon: Icon, label, onClick, color, permission }: ShortcutProps) {
  const content = (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-card p-4 transition-all hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02] active:scale-95 shadow-sm"
    >
      <div className={`rounded-xl p-2 ${color} bg-opacity-10`}>
        <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </Button>
  );

  if (permission) {
    return <PermissionGate permission={permission}>{content}</PermissionGate>;
  }

  return content;
}

export function DashboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts = [
    {
      icon: ShoppingCart,
      label: "New Sale",
      onClick: () => navigate("/app/sales"),
      color: "bg-emerald-500",
      permission: "create_sale"
    },
    {
      icon: PlusCircle,
      label: "New Item",
      onClick: () => navigate("/app/catalog?newItem=true"),
      color: "bg-blue-500",
      permission: "create_item"
    },
    {
      icon: Receipt,
      label: "Add Expense",
      onClick: () => navigate("/app/expenses"),
      color: "bg-amber-500",
      permission: "create_expense"
    },
    {
      icon: Users,
      label: "Customer",
      onClick: () => navigate("/app/customers"),
      color: "bg-purple-500",
      permission: "read_customer"
    },
    {
      icon: Truck,
      label: "Supplier",
      onClick: () => navigate("/app/suppliers"),
      color: "bg-rose-500",
      permission: "read_supplier"
    },
    {
      icon: History,
      label: "History",
      onClick: () => navigate("/app/sales-history"),
      color: "bg-slate-500",
      permission: "read_sale"
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 py-2">
      {shortcuts.map((s, idx) => (
        <Shortcut key={idx} {...s} />
      ))}
    </div>
  );
}
