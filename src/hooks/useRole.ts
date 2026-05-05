import { useContext } from "react";
import { RoleContext, type RoleContextValue } from "@/contexts/RoleContext";
import { getPermissionsForRole, type UserRoleType } from "@/lib/roles";

const defaultRoleContext: RoleContextValue = {
  role: "requestor",
  permissions: getPermissionsForRole("requestor"),
  isAdmin: false,
  isManager: false,
  isStaff: false,
  isRequestor: true,
};

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    console.warn("useRole was called outside of a RoleProvider. Falling back to requestor permissions.");
    return defaultRoleContext;
  }
  return ctx;
}
