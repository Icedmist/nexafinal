import { type ReactNode } from "react";
import { useRole } from "@/hooks/useRole";
import type { UserRoleType } from "@/lib/roles";

type PermissionAction =
  | "create_item" | "edit_item" | "delete_item"
  | "log_movement" | "create_po" | "approve_request"
  | "manage_users" | "view_analytics" | "export_data"
  | "create_request" | "access_settings" | "manage_suppliers";

const ACTION_ROLES: Record<PermissionAction, UserRoleType[]> = {
  create_item: ["admin", "manager", "system_admin"],
  edit_item: ["admin", "manager", "system_admin"],
  delete_item: ["admin", "manager", "system_admin"],
  log_movement: ["admin", "manager", "staff", "system_admin"],
  create_po: ["admin", "manager", "system_admin"],
  approve_request: ["admin", "manager", "system_admin"],
  manage_users: ["admin", "manager", "system_admin"],
  view_analytics: ["admin", "manager", "system_admin"],
  export_data: ["admin", "manager", "system_admin"],
  create_request: ["admin", "manager", "staff", "requestor", "system_admin"],
  access_settings: ["admin", "manager", "staff", "system_admin"],
  manage_suppliers: ["admin", "manager", "system_admin"],
};

export function usePermissions() {
  const { role } = useRole();

  const can = (action: PermissionAction): boolean => {
    return ACTION_ROLES[action]?.includes(role) ?? false;
  };

  return { can };
}

interface PermissionGateProps {
  permission: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
