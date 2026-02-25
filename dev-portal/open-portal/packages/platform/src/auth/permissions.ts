/**
 * Platform permission definitions.
 * These represent the set of all permissions in OpenPort.
 */
export const Permission = {
  // Platform-wide permissions
  PLATFORM_ADMIN: "platform.admin",
  PLATFORM_MANAGE_USERS: "platform.manageUsers",
  PLATFORM_CONFIGURE_PLUGINS: "platform.configurePlugins",
  PLATFORM_MANAGE_TEAMS: "platform.manageTeams",
  PLATFORM_VIEW_AUDIT: "platform.viewAudit",

  // Catalog permissions
  CATALOG_READ: "catalog.read",
  CATALOG_WRITE: "catalog.write",

  // Kubernetes permissions
  KUBERNETES_READ: "kubernetes.read",
  KUBERNETES_WRITE: "kubernetes.write",

  // Dashboard permissions
  DASHBOARD_EDIT: "dashboard.edit",
  DASHBOARD_VIEW: "dashboard.view",

  // Workflow permissions
  WORKFLOW_ADMIN: "workflow.admin",
  WORKFLOW_EXECUTE: "workflow.execute",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Server-side permission context.
 * Passed to requirePermission checks.
 */
export interface PermissionContext {
  userId: string | null;
  roles: string[];
  permissions: Permission[];
}

/**
 * Helper to check if a user has a required permission.
 * Throws 401 if unauthenticated, 403 if unauthorized.
 */
export function requirePermission(context: PermissionContext | null, permission: Permission): void {
  if (!context || !context.userId) {
    throw new Error("unauthenticated");
  }

  if (!context.permissions.includes(permission)) {
    throw new Error("unauthorized");
  }
}

/**
 * Exhaustive permission check for exhaustiveness validation.
 * @throws Compilation error if a permission is not handled.
 */
export function assertPermissionExhaustive(_permission: never): void {
  // This is used for exhaustiveness checking in switch statements
}
