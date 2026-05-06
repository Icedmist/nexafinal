import type { UserRoleType } from "@/lib/roles";

/** Maps route paths to the minimum roles allowed */
const ROUTE_ACCESS: Record<string, UserRoleType[]> = {
  "/app": ["admin", "manager", "staff", "requestor", "system_admin"],
  "/app/dashboard": ["admin", "manager", "staff", "requestor", "system_admin"],
  "/app/sales": ["admin", "manager", "staff", "system_admin"],
  "/app/sales-history": ["admin", "manager", "staff", "system_admin"],
  "/app/catalog": ["admin", "manager", "staff", "requestor", "system_admin"],
  "/app/requests": ["admin", "manager", "staff", "requestor", "system_admin"],
  "/app/movements": ["admin", "manager", "staff", "system_admin"],
  "/app/customers": ["admin", "manager", "staff", "system_admin"],
  "/app/suppliers": ["admin", "manager", "system_admin"],
  "/app/purchase-orders": ["admin", "manager", "requestor", "system_admin"],
  "/app/analytics": ["admin", "manager", "system_admin"],
  "/app/ai-insights": ["admin", "manager", "system_admin"],
  "/app/settings": ["admin", "manager", "staff", "system_admin"],
  "/app/staff": ["admin", "manager", "system_admin"],
  "/app/locations": ["admin", "manager", "system_admin"],
  "/app/sales-analytics": ["admin", "manager", "system_admin"],
  "/app/expenses": ["admin", "manager", "staff", "system_admin"],
  "/app/returns": ["admin", "manager", "staff", "system_admin"],
};

/**
 * Returns true if the given role can access the path.
 * Unknown paths default to admin-only.
 */
export function canAccessRoute(path: string, role: UserRoleType): boolean {
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return role === "admin";
  return allowed.includes(role);
}
