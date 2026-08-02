import { createContext, useMemo, useState, type ReactNode, useEffect } from "react";
import { getPermissionsForRole, isAdminRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useAuth } from "./FirebaseAuthContext";
import { doc, onSnapshot, query, collection, where, limit, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTenant } from "./TenantContext";
import { useBusiness } from "./BusinessContext";
import { useDemo } from "@/hooks/useDemo";

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
  const { isDemo } = useDemo();
  const [realRole, setRealRole] = useState<UserRoleType>("loading");
  const [loading, setLoading] = useState(true);
  const [isStoreMismatch, setIsStoreMismatch] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);

  // Demo mode: provide owner role immediately, skip Firestore
  useEffect(() => {
    if (isDemo) {
      setRealRole("owner");
      setLoading(false);
      return;
    }
  }, [isDemo]);

  // Reset the refreshed flag when the user changes
  useEffect(() => {
    setHasRefreshed(false);
  }, [user?.uid]);

  useEffect(() => {
    // Demo mode: already handled above, skip Firestore resolution
    if (isDemo) return;

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

    const isOwner = (store && user.uid === store.ownerId) || (user.uid === businessOwnerId);
    const activeStoreId = store?.id || businessStoreId;

    // Check for store mismatch early
    // We only check if the user HAS a storeId in their claims. 
    // System admins are global and don't mismatch.
    // Exclude owner from mismatch check to avoid stale claim lockout
    const hasMismatch = !!(
      claims?.storeId && 
      activeStoreId && 
      claims.storeId !== activeStoreId && 
      claims.role !== "system_admin" &&
      !isOwner
    );
    setIsStoreMismatch(hasMismatch);

    // Self-healing for stale branchId claims: compare the branch in the token
    // against the live staff document and force a token refresh once if they
    // differ. Mirrors the storeId mismatch refresh logic (guarded by
    // hasRefreshed) so a corrected staff.branchId takes effect in the UI
    // without requiring a manual sign-out/in.
    if (claims?.role && claims.role !== "system_admin" && claims.role !== "owner" && !isOwner) {
      (async () => {
        if (hasRefreshed) return;
        try {
          const staffSnap = await getDoc(doc(db, "staff", user.uid));
          if (!staffSnap.exists()) return;
          const liveBranchId = staffSnap.data()?.branchId || null;
          if ((claims.branchId || null) !== liveBranchId) {
            setHasRefreshed(true);
            console.log("BranchId claim mismatch detected. Forcing token refresh...");
            user.getIdToken(true).catch((err) => {
              console.error("Failed to force refresh token:", err);
            });
          }
        } catch (err) {
          console.error("Failed to fetch staff branchId for self-heal:", err);
        }
      })();
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

      // Security Check: If there's a mismatch, we don't grant the role from claims
      if (hasMismatch) {
        if (!hasRefreshed) {
          setHasRefreshed(true);
          console.log("Store mismatch detected. Attempting to force refresh token...");
          user.getIdToken(true)
            .then(() => {
              console.log("Token refreshed successfully");
            })
            .catch((err) => {
              console.error("Failed to force refresh token:", err);
            });
        }
        setRealRole("suspended");
        setLoading(false);
        return;
      }

      // Ensure the user's token storeId matches the current tenant context OR business context
      if (claims.storeId === activeStoreId && activeStoreId) {
        setRealRole(roleFromClaims);
        setLoading(false);
        return;
      }
    }

    if (isOwner && !hasMismatch) {
      setRealRole("owner");
      setLoading(false);
      return;
    }

    // 3. Default to database fallback, then default to staff if no specific role found (and no mismatch)
    const resolveFallback = async () => {
      try {
        const staffDocRef = doc(db, "staff", user.uid);
        const staffSnap = await getDoc(staffDocRef);
        if (staffSnap.exists()) {
          const staffData = staffSnap.data();
          if (staffData?.role && !hasMismatch) {
            setRealRole(staffData.role as UserRoleType);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch staff fallback role:", err);
      }

      if (!hasMismatch) {
        setRealRole("staff");
      } else {
        setRealRole("suspended");
      }
      setLoading(false);
    };

    resolveFallback();
  }, [user, store, loadingTenant, claims, claimsReady, businessStoreId, businessOwnerId, loadingProfile, hasRefreshed]);

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
