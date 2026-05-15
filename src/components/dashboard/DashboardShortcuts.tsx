import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, 
  PlusCircle, 
  Receipt, 
  Users, 
  Truck, 
  History,
  PackagePlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/hooks/usePermissions";
import { motion } from "framer-motion";

interface ShortcutProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color: string;
  permission?: string;
  index: number;
}

function Shortcut({ icon: Icon, label, onClick, color, permission, index }: ShortcutProps) {
  const content = (
    <motion.div
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
      }}
      transition={{ delay: index * 0.05 }}
    >
      <Button
        variant="outline"
        onClick={onClick}
        className="flex w-full h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-card p-4 transition-all hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02] active:scale-95 shadow-sm"
      >
        <div className={`rounded-xl p-2 ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
      </Button>
    </motion.div>
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
      label: "New Product",
      onClick: () => navigate("/app/catalog?newItem=true"),
      color: "bg-blue-500",
      permission: "create_item"
    },
    {
      icon: PackagePlus,
      label: "Restocking",
      onClick: () => navigate("/app/restocking?action=new"),
      color: "bg-indigo-500",
      permission: "create_movement"
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
      label: "Directory",
      onClick: () => navigate("/app/customers"),
      color: "bg-purple-500",
      permission: "read_customer"
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
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 py-2"
    >
      {shortcuts.map((s, idx) => (
        <Shortcut key={idx} {...s} index={idx} />
      ))}
    </motion.div>
  );
}
