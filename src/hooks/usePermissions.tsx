import { type ReactNode } from "react";
import { useRole } from "@/hooks/useRole";
import type { UserRoleType } from "@/lib/roles";

type PermissionAction =
  | "create_item" | "edit_item" | "delete_item"
  | "log_movement" | "create_po" | "approve_request"
  | "manage_users" | "view_analytics" | "export_data"
  | "create_request" | "access_settings" | "manage_suppliers"
  | "view_sales" | "record_sales" | "import_debtors";

const ACTION_ROLES: Record<PermissionAction, UserRoleType[]> = {
  create_item: ["admin", "manager", "system_admin", "owner"],
  edit_item: ["admin", "manager", "system_admin", "owner"],
  delete_item: ["admin", "manager", "system_admin", "owner"],
  log_movement: ["admin", "manager", "staff", "system_admin", "owner"],
  create_po: ["admin", "manager", "system_admin", "owner"],
  approve_request: ["admin", "manager", "system_admin", "owner"],
  manage_users: ["admin", "system_admin", "owner"],
  view_analytics: ["admin", "manager", "system_admin", "owner"],
  export_data: ["admin", "manager", "system_admin", "owner"],
  create_request: ["admin", "manager", "staff", "system_admin", "owner"],
  access_settings: ["admin", "manager", "staff", "system_admin", "owner"],
  manage_suppliers: ["admin", "manager", "system_admin", "owner"],
  view_sales: ["admin", "manager", "staff", "system_admin", "owner"],
  record_sales: ["admin", "manager", "staff", "system_admin", "owner"],
  import_debtors: ["admin", "manager", "system_admin", "owner"],
};

export function usePermissions() {
  const { role, loading } = useRole();

  const can = (action: PermissionAction): boolean => {
    if (loading) return false;
    return ACTION_ROLES[action]?.includes(role) ?? false;
  };

  return { can, loading };
}

interface PermissionGateProps {
  permission: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { can, loading } = usePermissions();
  
  if (loading) return null; // Or a skeleton loader
  
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
