import { createContext, useMemo, useState, type ReactNode, useEffect } from "react";
import { getPermissionsForRole, isAdminRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useAuth } from "./FirebaseAuthContext";
import { doc, onSnapshot, query, collection, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTenant } from "./TenantContext";
import { useBusiness } from "./BusinessContext";

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
  const { storeId: businessStoreId, ownerId: businessOwnerId, loadingProfile } = useBusiness();
  const [realRole, setRealRole] = useState<UserRoleType>("requestor");

  useEffect(() => {
    if (!user || loadingTenant || loadingProfile) {
      if (!loadingTenant && !loadingProfile && !user) setRealRole("requestor");
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

      // Security Check: Ensure the user's token storeId matches the current tenant context OR business context
      const activeStoreId = store?.id || businessStoreId;
      if (claims.storeId === activeStoreId && activeStoreId) {
        setRealRole(roleFromClaims);
        return;
      }
    }

    // 2. Fallback: Check if user is the store owner (merchant root)
    // We check both the tenant store and the business context store
    const isOwner = (store && user.uid === store.ownerId) || (user.uid === businessOwnerId);
    
    if (isOwner) {
      setRealRole("owner");
      return;
    }

    // 3. If no claims and not owner, default to requestor
    setRealRole("requestor");
  }, [user, store, loadingTenant, claims, businessStoreId, businessOwnerId, loadingProfile]);

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
