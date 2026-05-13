import { useContext } from "react";
import { RoleContext, type RoleContextValue } from "@/contexts/RoleContext";
import { getPermissionsForRole, type UserRoleType } from "@/lib/roles";

const defaultRoleContext: RoleContextValue = {
  role: "staff",
  permissions: getPermissionsForRole("staff"),
  isAdmin: false,
  isManager: false,
  isStaff: true,
  isSystemAdmin: false,
  loading: true,
  isStoreMismatch: false,
};

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    console.warn("useRole was called outside of a RoleProvider. Falling back to default permissions.");
    return defaultRoleContext;
  }
  return ctx;
}
