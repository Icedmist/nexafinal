import { createContext, useMemo, useState, type ReactNode, useContext, useEffect } from "react";
import { useDemo } from "@/hooks/useDemo";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useBusiness } from "./BusinessContext";
import { useAuth } from "./FirebaseAuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface RoleContextValue {
  role: UserRoleType;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isRequestor: boolean;
  /** Demo-only: override the current role */
  setDemoRole: (role: UserRoleType) => void;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useDemo();
  const { user } = useAuth();
  const [demoRole, setDemoRole] = useState<UserRoleType>("admin");
  const [realRole, setRealRole] = useState<UserRoleType>("requestor");

  useEffect(() => {
    if (isDemo || !user) return;

    // Try finding role in staff collection first
    const staffRef = doc(db, 'staff', user.uid);
    const unsubStaff = onSnapshot(staffRef, (snap) => {
      if (snap.exists()) {
        setRealRole(snap.data().role as UserRoleType);
      } else {
        // Fallback to admin if they are the owner (present in users collection)
        // This is a simplification; you might have a 'role' field in the users doc too
        setRealRole("admin");
      }
    });

    return () => unsubStaff();
  }, [user, isDemo]);

  const role: UserRoleType = isDemo ? demoRole : realRole;

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isStaff: role === "staff",
      isRequestor: role === "requestor",
      setDemoRole,
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
