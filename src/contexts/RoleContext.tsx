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
      if (!loadingTenant && !loadingProfile && !user) {
        console.log("[RoleContext] No user found, setting role to requestor");
        setRealRole("requestor");
      }
      return;
    }

    console.log("[RoleContext] Determining role for:", {
      uid: user.uid,
      claimsRole: claims?.role,
      claimsStoreId: claims?.storeId,
      storeId: store?.id,
      businessStoreId,
      ownerId: store?.ownerId || businessOwnerId
    });

    // 1. High Priority: Use Custom Claims (Zero DB Read)
    if (claims?.role) {
      const roleFromClaims = claims.role as UserRoleType;

      // System admins are global and should bypass store-scoped claim validation.
      if (roleFromClaims === "system_admin") {
        console.log("[RoleContext] System Admin detected via claims");
        setRealRole(roleFromClaims);
        return;
      }

      // Security Check: Ensure the user's token storeId matches the current tenant context OR business context
      const activeStoreId = store?.id || businessStoreId;
      if (claims.storeId === activeStoreId && activeStoreId) {
        console.log("[RoleContext] Valid store claim found:", roleFromClaims);
        setRealRole(roleFromClaims);
        return;
      } else {
        console.warn("[RoleContext] Store ID mismatch:", {
          claimsStoreId: claims.storeId,
          activeStoreId
        });
      }
    }

    // 2. Fallback: Check if user is the store owner (merchant root)
    // We check both the tenant store and the business context store
    const isOwner = (store && user.uid === store.ownerId) || (user.uid === businessOwnerId);
    
    if (isOwner) {
      console.log("[RoleContext] User is store owner, setting role to owner");
      setRealRole("owner");
      return;
    }

    // 3. If no claims and not owner, default to requestor
    console.log("[RoleContext] Defaulting to requestor");
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
