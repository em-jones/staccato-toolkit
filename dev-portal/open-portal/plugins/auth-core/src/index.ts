/**
 * Auth core — re-exports all authentication and authorization interfaces
 * from the platform package.
 *
 * Consumers import from `@op-plugin/auth-core` rather than `@op/platform`
 * to decouple from the platform internals.
 */
export type {
  AuthAPI,
  AuthService,
  AuthServiceConfig,
  AuthorizationCheck,
  AuthorizationService,
  CreateOrganizationInput,
  CreateUserInput,
  Organization,
  OrganizationMember,
  Permission,
  PermissionCheck,
  PermissionMap,
  PermissionResult,
  PluginConfig,
  Policy,
  PolicyAPI,
  PolicyRule,
  ResourcePermission,
  Role,
  RoleAPI,
  UpdateOrganizationInput,
  UpdateUserInput,
  User,
  UserOperation,
} from "@op/platform/auth";
export { createAuthService } from "@op/platform/auth";
