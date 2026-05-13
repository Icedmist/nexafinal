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
  isSystemAdmin: boolean;
  loading: boolean;
  isStoreMismatch: boolean;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, claims, claimsReady } = useAuth();
  const { store, loading: loadingTenant } = useTenant();
  const { storeId: businessStoreId, ownerId: businessOwnerId, loadingProfile } = useBusiness();
  const [realRole, setRealRole] = useState<UserRoleType>("staff");
  const [loading, setLoading] = useState(true);
  const [isStoreMismatch, setIsStoreMismatch] = useState(false);

  useEffect(() => {
    // If we're still loading core data, stay in loading state
    if (loadingTenant || loadingProfile || !claimsReady) {
      setLoading(true);
      return;
    }

    // If no user, we're not loading anymore, but there's no role
    if (!user) {
      setLoading(false);
      return;
    }

    const activeStoreId = store?.id || businessStoreId;

    // Check for store mismatch early
    if (claims?.storeId && activeStoreId && claims.storeId !== activeStoreId && claims.role !== "system_admin") {
      setIsStoreMismatch(true);
    } else {
      setIsStoreMismatch(false);
    }

    // 1. High Priority: Use Custom Claims (Zero DB Read)
    if (claims?.role) {
      const roleFromClaims = claims.role as UserRoleType;

      // System admins are global
      if (roleFromClaims === "system_admin") {
        setRealRole(roleFromClaims);
        setLoading(false);
        return;
      }

      // Security Check: Ensure the user's token storeId matches the current tenant context OR business context
      if (claims.storeId === activeStoreId && activeStoreId) {
        setRealRole(roleFromClaims);
        setLoading(false);
        return;
      }
    }

    // 2. Fallback: Check if user is the store owner (merchant root)
    const isOwner = (store && user.uid === store.ownerId) || (user.uid === businessOwnerId);
    
    if (isOwner) {
      setRealRole("owner");
      setLoading(false);
      return;
    }

    // 3. Default to staff if no specific role found
    setRealRole("staff");
    setLoading(false);
  }, [user, store, loadingTenant, claims, claimsReady, businessStoreId, businessOwnerId, loadingProfile]);

  const value = useMemo<RoleContextValue>(() => {
    const role = realRole;
    const permissions = getPermissionsForRole(role);
    const isSysAdmin = role === "system_admin";
    const isAdmin = isAdminRole(role);
    const isManager = role === "manager" || isAdmin;

    return {
      role,
      permissions,
      isAdmin,
      isManager,
      isStaff: role === "staff",
      isSystemAdmin: isSysAdmin,
      loading,
      isStoreMismatch,
    };
  }, [realRole, loading, isStoreMismatch]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
