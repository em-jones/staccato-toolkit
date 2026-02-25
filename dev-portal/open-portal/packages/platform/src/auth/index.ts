export * from "./audit.ts";
export * from "./membership.ts";
export * from "./permissions.ts";
export * from "./roles.ts";
export * from "./service-identity.ts";
export * from "./tenant.ts";

/**
 * Core type definitions for the IAM system
 */

/**
 * Individual permission grant
 */
export interface Permission {
  resource: string;
  action: string;
}

/**
 * Maps a resource to its allowed actions
 */
export interface ResourcePermission<TActions extends string = string> {
  resource: string;
  actions: TActions[];
}

/**
 * Plugin registration metadata with optional resource permissions
 */
export interface AuthPluginConfig {
  name: string;
  version: string;
  resourcePermissions?: ResourcePermission[];
}

/**
 * User identity with scoped role assignments
 */
export interface User<TRoleName extends string = string> {
  role?: TRoleName;
  organizationId?: string;
  organizationRole?: TRoleName;
  id: string;
  email?: string;
  name?: string;
  roles?: Array<{
    roleId: TRoleName;
    scope?: string;
  }>;
}

/**
 * Request context for user CRUD operations
 */
export interface UserOperation<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  context: TContext;
  payload: TPayload;
}

/**
 * ABAC authorization request with user, action, resource, and context
 */
export interface AuthorizationCheck<
  TAction extends string = string,
  TResource extends string = string,
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  userId: string;
  action: TAction;
  resource: TResource;
  context?: TContext;
}

/**
 * Policy rule for ABAC evaluation
 */
export interface PolicyRule {
  effect: "allow" | "deny";
  actions: string[];
  resources: string[];
  conditions?: Record<string, unknown>;
  priority?: number;
}

/**
 * Named collection of resource/action permissions with ABAC rules
 */
export interface Policy {
  id: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
  algorithm: "deny-overrides" | "allow-overrides" | "first-match" | "highest-priority";
}

/**
 * Named collection of permissions with inheritance support
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: ResourcePermission[];
  inherits?: string[];
}

/**
 * Result of a permission check
 */
export interface PermissionResult {
  action: string;
  resource: string;
  allowed: boolean;
}

/**
 * Permission check request
 */
export interface PermissionCheck {
  action: string;
  resource: string;
}

/**
 * Map of permissions for a user (resource -> actions)
 */
export type PermissionMap = Record<string, string[]>;

/**
 * Organization representation
 */
export interface Organization {
  id: string;
  name: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Input for creating a user
 */
export interface CreateUserInput {
  email: string;
  name?: string;
  password?: string;
}

/**
 * Input for updating a user
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
}

/**
 * Input for creating an organization
 */
export interface CreateOrganizationInput {
  name: string;
  slug?: string;
}

/**
 * Input for updating an organization
 */
export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
}

/**
 * Authentication API interface that abstracts user and organization management
 */
export interface AuthAPI {
  /**
   * Create a new user
   */
  createUser(input: CreateUserInput): Promise<User>;

  /**
   * Get a user by ID
   */
  getUser(id: string): Promise<User | null>;

  /**
   * Update a user
   */
  updateUser(id: string, data: UpdateUserInput): Promise<User>;

  /**
   * Delete a user
   */
  deleteUser(id: string): Promise<void>;

  /**
   * Get all organizations
   */
  getOrganizations(): Promise<Organization[]>;

  /**
   * Get a specific organization
   */
  getOrganization(id: string): Promise<Organization | null>;

  /**
   * Create a new organization
   */
  createOrganization(data: CreateOrganizationInput): Promise<Organization>;

  /**
   * Update an organization
   */
  updateOrganization(id: string, data: UpdateOrganizationInput): Promise<Organization>;

  /**
   * Map external provider user objects to the core User type
   */
  mapProviderUserToCoreUser<T>(providerUser: T, roleApi: RoleAPI): Promise<User>;
}

/**
 * Role management API interface
 */
export interface RoleAPI {
  /**
   * Get all roles for an organization
   */
  getRolesForOrg(orgId: string): Promise<Role[]>;

  /**
   * Get a specific role
   */
  getRole(id: string): Promise<Role | null>;

  /**
   * Create a new role
   */
  createRole(data: Omit<Role, "id">): Promise<Role>;

  /**
   * Update a role
   */
  updateRole(id: string, data: Partial<Omit<Role, "id">>): Promise<Role>;

  /**
   * Delete a role
   */
  deleteRole(id: string): Promise<void>;

  /**
   * Assign a role to a user (optionally scoped to an organization)
   */
  assignRole(userId: string, roleId: string, scope?: string): Promise<void>;

  /**
   * Revoke a role from a user
   */
  revokeRole(userId: string, roleId: string, scope?: string): Promise<void>;

  /**
   * Get all roles assigned to a user
   */
  getRolesForUser(userId: string, scope?: string): Promise<Role[]>;
}

/**
 * Policy management API interface
 */
export interface PolicyAPI {
  /**
   * Create a new policy
   */
  createPolicy(data: Omit<Policy, "id">): Promise<Policy>;

  /**
   * Get a specific policy by ID
   */
  getPolicy(id: string): Promise<Policy | null>;

  /**
   * Update an existing policy
   */
  updatePolicy(id: string, data: Partial<Omit<Policy, "id">>): Promise<Policy>;

  /**
   * Delete a policy
   */
  deletePolicy(id: string): Promise<void>;

  /**
   * List all policies
   */
  listPolicies(): Promise<Policy[]>;
}

/**
 * Authorization service interface
 */
export interface AuthorizationService {
  /**
   * Single permission check
   */
  userCan<
    TAction extends string = string,
    TResource extends string = string,
    TContext extends Record<string, unknown> = Record<string, unknown>,
  >(
    check: AuthorizationCheck<TAction, TResource, TContext>,
  ): Promise<boolean>;

  /**
   * Batch permission check
   */
  checkPermissions(userId: string, checks: PermissionCheck[]): Promise<PermissionResult[]>;

  /**
   * Get all permissions for a user
   */
  getEffectivePermissions(userId: string, scope?: string): Promise<PermissionMap>;
}

/**
 * Service configuration
 */
export interface AuthServiceConfig {
  authProvider: AuthAPI;
  authorizationProvider: AuthorizationService;
  plugins?: AuthPluginConfig[];
}

/**
 * Combined auth service interface
 */
export interface AuthService extends AuthAPI, AuthorizationService {}

/**
 * Create an auth service from providers
 */
export function createAuthService(config: AuthServiceConfig): AuthService {
  const { authProvider, authorizationProvider } = config;

  return {
    // AuthAPI methods
    createUser: (input) => authProvider.createUser(input),
    getUser: (id) => authProvider.getUser(id),
    updateUser: (id, data) => authProvider.updateUser(id, data),
    deleteUser: (id) => authProvider.deleteUser(id),
    getOrganizations: () => authProvider.getOrganizations(),
    getOrganization: (id) => authProvider.getOrganization(id),
    createOrganization: (data) => authProvider.createOrganization(data),
    updateOrganization: (id, data) => authProvider.updateOrganization(id, data),
    mapProviderUserToCoreUser: (providerUser, roleApi) =>
      authProvider.mapProviderUserToCoreUser(providerUser, roleApi),

    // AuthorizationService methods
    userCan: (check) => authorizationProvider.userCan(check),
    checkPermissions: (userId, checks) => authorizationProvider.checkPermissions(userId, checks),
    getEffectivePermissions: (userId, scope) =>
      authorizationProvider.getEffectivePermissions(userId, scope),
  };
}

/**
 * Organization member with role assignment
 */
export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: string;
  joinedAt?: Date;
}

// ---------------------------------------------------------------------------
// Multi-tenant composite service
// ---------------------------------------------------------------------------

import type { AuditAPI } from "./audit.ts";
import type { MembershipAPI } from "./membership.ts";
import type { ServiceIdentityAPI } from "./service-identity.ts";
import type { TenantAPI } from "./tenant.ts";

/**
 * Configuration for the multi-tenant auth service.
 *
 * Extends the base {@link AuthServiceConfig} with tenant-aware providers
 * for membership, service identities, and audit logging.
 */
export interface MultiTenantAuthServiceConfig extends AuthServiceConfig {
  tenantProvider: TenantAPI;
  membershipProvider: MembershipAPI;
  serviceIdentityProvider: ServiceIdentityAPI;
  auditProvider: AuditAPI;
}

/**
 * Composite service that combines all multi-tenant auth capabilities.
 *
 * This is the primary entry point for tenant-aware operations. It exposes
 * the full surface area of:
 * - {@link AuthAPI} — user and organization CRUD
 * - {@link AuthorizationService} — permission checks (RBAC + ABAC)
 * - {@link TenantAPI} — tenant lifecycle and settings
 * - {@link MembershipAPI} — member and invitation management
 * - {@link ServiceIdentityAPI} — machine credential management
 * - {@link AuditAPI} — audit log queries
 *
 * ## Usage
 *
 * ```ts
 * import { createMultiTenantAuthService } from "@op/platform/auth";
 *
 * const authService = createMultiTenantAuthService({
 *   authProvider,
 *   authorizationProvider,
 *   tenantProvider,
 *   membershipProvider,
 *   serviceIdentityProvider,
 *   auditProvider,
 * });
 *
 * // Tenant lifecycle
 * const tenant = await authService.createTenant({ ... });
 *
 * // Membership
 * await authService.inviteMember(tenant.id, { email: "dev@co.com", role: "member" });
 *
 * // Authorization (tenant-scoped)
 * const allowed = await authService.userCan({ userId, action: "catalog.read", resource: "component:api" });
 * ```
 */
export interface MultiTenantAuthService
  extends AuthService, TenantAPI, MembershipAPI, ServiceIdentityAPI, AuditAPI {}

/**
 * Create a multi-tenant auth service by composing individual providers.
 */
export function createMultiTenantAuthService(
  config: MultiTenantAuthServiceConfig,
): MultiTenantAuthService {
  const base = createAuthService(config);
  const { tenantProvider, membershipProvider, serviceIdentityProvider, auditProvider } = config;

  const service: MultiTenantAuthService = {
    // Base AuthService (AuthAPI + AuthorizationService)
    createUser: (input) => base.createUser(input),
    getUser: (id) => base.getUser(id),
    updateUser: (id, data) => base.updateUser(id, data),
    deleteUser: (id) => base.deleteUser(id),
    getOrganizations: () => base.getOrganizations(),
    getOrganization: (id) => base.getOrganization(id),
    createOrganization: (data) => base.createOrganization(data),
    updateOrganization: (id, data) => base.updateOrganization(id, data),
    mapProviderUserToCoreUser: (providerUser, roleApi) =>
      base.mapProviderUserToCoreUser(providerUser, roleApi),
    userCan: (check) => base.userCan(check),
    checkPermissions: (userId, checks) => base.checkPermissions(userId, checks),
    getEffectivePermissions: (userId, scope) => base.getEffectivePermissions(userId, scope),

    // TenantAPI
    createTenant: (input) => tenantProvider.createTenant(input),
    getTenant: (id) => tenantProvider.getTenant(id),
    getTenantBySlug: (slug) => tenantProvider.getTenantBySlug(slug),
    listTenants: (filter, pagination) => tenantProvider.listTenants(filter, pagination),
    updateTenant: (id, data) => tenantProvider.updateTenant(id, data),
    suspendTenant: (id, reason) => tenantProvider.suspendTenant(id, reason),
    reactivateTenant: (id) => tenantProvider.reactivateTenant(id),
    deprovisionTenant: (id) => tenantProvider.deprovisionTenant(id),
    getSettings: (tenantId) => tenantProvider.getSettings(tenantId),
    updateSettings: (tenantId, data) => tenantProvider.updateSettings(tenantId, data),

    // MembershipAPI
    addMember: (tenantId, input) => membershipProvider.addMember(tenantId, input),
    getMember: (tenantId, membershipId) => membershipProvider.getMember(tenantId, membershipId),
    getMemberByUser: (tenantId, userId) => membershipProvider.getMemberByUser(tenantId, userId),
    listMembers: (tenantId, filter, pagination) =>
      membershipProvider.listMembers(tenantId, filter, pagination),
    updateMember: (tenantId, membershipId, data) =>
      membershipProvider.updateMember(tenantId, membershipId, data),
    removeMember: (tenantId, membershipId) =>
      membershipProvider.removeMember(tenantId, membershipId),
    transferOwnership: (tenantId, newOwnerMembershipId) =>
      membershipProvider.transferOwnership(tenantId, newOwnerMembershipId),
    addTeamRole: (membershipId, teamId, role) =>
      membershipProvider.addTeamRole(membershipId, teamId, role),
    removeTeamRole: (bindingId) => membershipProvider.removeTeamRole(bindingId),
    listTeamRoles: (membershipId) => membershipProvider.listTeamRoles(membershipId),
    inviteMember: (tenantId, input) => membershipProvider.inviteMember(tenantId, input),
    acceptInvitation: (token) => membershipProvider.acceptInvitation(token),
    declineInvitation: (token) => membershipProvider.declineInvitation(token),
    revokeInvitation: (invitationId) => membershipProvider.revokeInvitation(invitationId),
    resendInvitation: (invitationId) => membershipProvider.resendInvitation(invitationId),
    listInvitations: (tenantId, filter, pagination) =>
      membershipProvider.listInvitations(tenantId, filter, pagination),
    listTenantsForUser: (userId) => membershipProvider.listTenantsForUser(userId),
    countSeats: (tenantId) => membershipProvider.countSeats(tenantId),

    // ServiceIdentityAPI
    createIdentity: (tenantId, input) => serviceIdentityProvider.createIdentity(tenantId, input),
    getIdentity: (tenantId, identityId) =>
      serviceIdentityProvider.getIdentity(tenantId, identityId),
    listIdentities: (tenantId, filter, pagination) =>
      serviceIdentityProvider.listIdentities(tenantId, filter, pagination),
    updateIdentity: (tenantId, identityId, data) =>
      serviceIdentityProvider.updateIdentity(tenantId, identityId, data),
    rotateSecret: (tenantId, identityId, options) =>
      serviceIdentityProvider.rotateSecret(tenantId, identityId, options),
    suspendIdentity: (tenantId, identityId) =>
      serviceIdentityProvider.suspendIdentity(tenantId, identityId),
    reactivateIdentity: (tenantId, identityId) =>
      serviceIdentityProvider.reactivateIdentity(tenantId, identityId),
    revokeIdentity: (tenantId, identityId) =>
      serviceIdentityProvider.revokeIdentity(tenantId, identityId),
    validateCredentials: (clientId, clientSecret) =>
      serviceIdentityProvider.validateCredentials(clientId, clientSecret),

    // AuditAPI
    listEntries: (tenantId, filter, pagination) =>
      auditProvider.listEntries(tenantId, filter, pagination),
    getEntry: (tenantId, entryId) => auditProvider.getEntry(tenantId, entryId),
    exportEntries: (tenantId, filter) => auditProvider.exportEntries(tenantId, filter),
    getSummary: (tenantId, from, to) => auditProvider.getSummary(tenantId, from, to),
  };

  return service;
}
