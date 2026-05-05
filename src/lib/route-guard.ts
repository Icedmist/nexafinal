import type { UserRoleType } from "@/lib/roles";

/** Maps route paths to the minimum roles allowed */
const ROUTE_ACCESS: Record<string, UserRoleType[]> = {
  "/app": ["admin", "manager", "staff", "requestor"],
  "/app/dashboard": ["admin", "manager", "staff", "requestor"],
  "/app/sales": ["admin", "manager", "staff"],
  "/app/sales-history": ["admin", "manager", "staff"],
  "/app/catalog": ["admin", "manager", "staff", "requestor"],
  "/app/requests": ["admin", "manager", "staff", "requestor"],
  "/app/movements": ["admin", "manager", "staff"],
  "/app/suppliers": ["admin", "manager"],
  "/app/purchase-orders": ["admin", "manager", "requestor"],
  "/app/analytics": ["admin", "manager"],
  "/app/ai-insights": ["admin", "manager"],
  "/app/settings": ["admin"],
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
