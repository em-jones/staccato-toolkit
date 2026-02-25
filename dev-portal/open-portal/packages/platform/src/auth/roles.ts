import { Permission } from "./permissions.ts";

/**
 * Role definitions and their associated permissions.
 */
export const Role = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
  OPERATOR: "operator",
  WORKFLOW_ADMIN: "workflow.admin",
  DASHBOARD_EDIT: "dashboard.edit",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/**
 * Map of roles to their permissions.
 */
const RolePermissionMap: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.PLATFORM_ADMIN,
    Permission.PLATFORM_MANAGE_USERS,
    Permission.PLATFORM_CONFIGURE_PLUGINS,
    Permission.PLATFORM_MANAGE_TEAMS,
    Permission.PLATFORM_VIEW_AUDIT,
    Permission.CATALOG_READ,
    Permission.CATALOG_WRITE,
    Permission.KUBERNETES_READ,
    Permission.KUBERNETES_WRITE,
    Permission.DASHBOARD_EDIT,
    Permission.DASHBOARD_VIEW,
    Permission.WORKFLOW_ADMIN,
    Permission.WORKFLOW_EXECUTE,
  ],
  [Role.EDITOR]: [
    Permission.CATALOG_READ,
    Permission.CATALOG_WRITE,
    Permission.KUBERNETES_READ,
    Permission.DASHBOARD_EDIT,
    Permission.DASHBOARD_VIEW,
    Permission.WORKFLOW_EXECUTE,
  ],
  [Role.VIEWER]: [Permission.CATALOG_READ, Permission.KUBERNETES_READ, Permission.DASHBOARD_VIEW],
  [Role.OPERATOR]: [
    Permission.KUBERNETES_READ,
    Permission.KUBERNETES_WRITE,
    Permission.DASHBOARD_VIEW,
    Permission.WORKFLOW_EXECUTE,
  ],
  [Role.WORKFLOW_ADMIN]: [
    Permission.WORKFLOW_ADMIN,
    Permission.WORKFLOW_EXECUTE,
    Permission.CATALOG_READ,
  ],
  [Role.DASHBOARD_EDIT]: [Permission.DASHBOARD_EDIT, Permission.DASHBOARD_VIEW],
};

/**
 * Get permissions for a given role.
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return RolePermissionMap[role] || [];
}

/**
 * Get permissions for multiple roles.
 */
export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const permissions = new Set<Permission>();

  for (const role of roles) {
    for (const p of getPermissionsForRole(role)) {
      permissions.add(p);
    }
  }

  return Array.from(permissions);
}
