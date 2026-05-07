import { createContext, useMemo, useState, type ReactNode, useEffect } from "react";
import { getPermissionsForRole, isAdminRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useAuth } from "./FirebaseAuthContext";
import { doc, onSnapshot, query, collection, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTenant } from "./TenantContext";

export interface RoleContextValue {
  role: UserRoleType;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isRequestor: boolean;
  isSystemAdmin: boolean;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, claims } = useAuth();
  const { store, loading: loadingTenant } = useTenant();
  const [realRole, setRealRole] = useState<UserRoleType>("requestor");

  useEffect(() => {
    if (!user || loadingTenant) {
      if (!loadingTenant) setRealRole("requestor");
      return;
    }

    // 1. High Priority: Use Custom Claims (Zero DB Read)
    if (claims?.role) {
      const roleFromClaims = claims.role as UserRoleType;

      // System admins are global and should bypass store-scoped claim validation.
      if (roleFromClaims === "system_admin") {
        setRealRole(roleFromClaims);
        return;
      }

      // Security Check: Ensure the user's token storeId matches the current tenant context
      if (claims.storeId === store?.id) {
        setRealRole(roleFromClaims);
        return;
      }
    }

    // 2. Fallback: Check if user is the store owner (merchant root)
    if (store && user.uid === store.ownerId) {
      setRealRole("owner");
      return;
    }

    // 3. If no claims and not owner, default to requestor
    setRealRole("requestor");
  }, [user, store, loadingTenant, claims]);

  const role: UserRoleType = realRole;

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    const isSysAdmin = role === "system_admin";
    const isOwner = role === "owner";
    const isAdmin = isAdminRole(role);
    const isManager = role === "manager" || isAdmin;

    return {
      role,
      permissions,
      isAdmin,
      isManager,
      isStaff: role === "staff",
      isRequestor: role === "requestor",
      isSystemAdmin: isSysAdmin,
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
