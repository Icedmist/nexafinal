import { UserRoleType, isAdminRole } from "@/lib/roles";

/** Maps route paths to the minimum roles allowed */
const ROUTE_ACCESS: Record<string, UserRoleType[]> = {
  "/app": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/dashboard": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/sales": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/sales-history": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/catalog": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/requests": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/movements": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/customers": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/suppliers": ["admin", "manager", "system_admin", "owner"],
  "/app/restocking": ["admin", "manager", "system_admin", "owner"],
  "/app/analytics": ["admin", "manager", "system_admin", "owner"],
  "/app/ai-insights": ["admin", "manager", "system_admin", "owner"],
  "/app/settings": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/staff": ["admin", "manager", "system_admin", "owner"],
  "/app/locations": ["admin", "manager", "system_admin", "owner"],
  "/app/sales-analytics": ["admin", "manager", "system_admin", "owner"],
  "/app/expenses": ["admin", "manager", "staff", "system_admin", "owner"],
  "/app/returns": ["admin", "manager", "staff", "system_admin", "owner"],
  
  // System Admin Routes
  "/system-admin": ["system_admin"],
  "/system-admin/dashboard": ["system_admin"],
  "/system-admin/businesses": ["system_admin"],
  "/system-admin/users": ["system_admin"],
  "/system-admin/health": ["system_admin"],
  "/system-admin/settings": ["system_admin"],
  "/system-admin/audit": ["system_admin"],
  "/system-admin/agents-network": ["system_admin"],
  "/system-admin/subscriptions": ["system_admin"],
  "/system-admin/retention": ["system_admin"],
};

/**
 * Returns true if the given role can access the path.
 * Unknown paths default to admin-only.
 */
export function canAccessRoute(path: string, role: UserRoleType): boolean {
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return isAdminRole(role);
  return allowed.includes(role);
}
