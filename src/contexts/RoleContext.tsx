import { createContext, useMemo, useState, type ReactNode, useEffect } from "react";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
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
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { store, loading: loadingTenant } = useTenant();
  const [realRole, setRealRole] = useState<UserRoleType>("requestor");

  useEffect(() => {
    if (!user || loadingTenant) {
      if (!loadingTenant) setRealRole("requestor");
      return;
    }

    // 1. Check if user is the store owner
    if (store && user.uid === store.ownerId) {
      setRealRole("admin");
      return;
    }

    // 2. Otherwise check staff collection, strictly scoped to this store
    const staffRef = doc(db, 'staff', user.uid);
    const unsubStaff = onSnapshot(staffRef, async (snap) => {
      if (snap.exists()) {
        const staffData = snap.data();
        if (store && staffData.storeId === store.id) {
          setRealRole(staffData.role as UserRoleType);
        } else {
          setRealRole("requestor");
        }
      } else if (user.email && store) {
        // Fallback: search by email scoped by storeId
        const q = query(
          collection(db, "staff"), 
          where("email", "==", user.email), 
          where("storeId", "==", store.id),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setRealRole(snapshot.docs[0].data().role as UserRoleType);
        } else {
          setRealRole("requestor");
        }
      } else {
        setRealRole("requestor");
      }
    });

    return () => unsubStaff();
  }, [user, store, loadingTenant]);

  const role: UserRoleType = realRole;

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isStaff: role === "staff",
      isRequestor: role === "requestor",
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
