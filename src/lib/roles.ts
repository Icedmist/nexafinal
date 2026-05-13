export type UserRoleType = "admin" | "manager" | "staff" | "system_admin" | "owner";

export interface RolePermissions {
  canManageItems: boolean;
  canLogMovements: boolean;
  canManagePOs: boolean;
  canManageSuppliers: boolean;
  canApproveRequests: boolean;
  canViewAnalytics: boolean;
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canViewSales: boolean;
  canRecordSales: boolean;
}

const ROLE_PERMISSIONS: Record<UserRoleType, RolePermissions> = {
  admin: {
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: true,
    canManageUsers: true,
    canViewSales: true,
    canRecordSales: true,
  },
  owner: {
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: true,
    canManageUsers: true,
    canViewSales: true,
    canRecordSales: true,
  },
  manager: {
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: true,
    canManageUsers: false,
    canViewSales: true,
    canRecordSales: true,
  },
  staff: {
    canManageItems: false,
    canLogMovements: true,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: false,
    canAccessSettings: true,
    canManageUsers: false,
    canViewSales: true,
    canRecordSales: true,
  },

  system_admin: {
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: true,
    canManageUsers: true,
    canViewSales: true,
    canRecordSales: true,
  },
};

export function getPermissionsForRole(role: UserRoleType): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

export function isAdminRole(role?: string | null): boolean {
  return role === "admin" || role === "system_admin" || role === "owner";
}
