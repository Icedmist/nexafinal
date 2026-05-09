import {
  Plus,
  ArrowRightLeft,
  ShoppingCart,
  ClipboardList,
  Truck,
  FileDown,
} from "lucide-react";
import type { useNavigate } from "react-router-dom";
import type { usePermissions } from "@/hooks/usePermissions";

export interface ActionDef {
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: (navigate: ReturnType<typeof useNavigate>) => void;
  permission?: Parameters<ReturnType<typeof usePermissions>["can"]>[0];
}

export const ACTIONS: ActionDef[] = [
  {
    label: "New Item",
    icon: <Plus className="h-4 w-4" />,
    shortcut: "N I",
    action: (nav) => nav("/app/catalog"),
    permission: "create_item",
  },
  {
    label: "New Movement",
    icon: <ArrowRightLeft className="h-4 w-4" />,
    shortcut: "N M",
    action: (nav) => nav("/app/movements"),
    permission: "log_movement",
  },
  {
    label: "New Restock",
    icon: <ShoppingCart className="h-4 w-4" />,
    shortcut: "N P",
    action: (nav) => nav("/app/restocking"),
    permission: "create_po",
  },
  {
    label: "New Request",
    icon: <ClipboardList className="h-4 w-4" />,
    action: (nav) => nav("/app/requests"),
    permission: "create_request",
  },
  {
    label: "New Supplier",
    icon: <Truck className="h-4 w-4" />,
    action: (nav) => nav("/app/suppliers"),
    permission: "manage_suppliers",
  },
  {
    label: "Export Items CSV",
    icon: <FileDown className="h-4 w-4" />,
    action: (nav) => nav("/app/catalog"),
    permission: "export_data",
  },
];
