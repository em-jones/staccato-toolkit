/**
 * @module tenant
 *
 * Multi-tenant isolation primitives for the OpenPort platform.
 *
 * A **Tenant** is the top-level isolation boundary. Every resource in the
 * system belongs to exactly one tenant. In practice a tenant maps 1:1 to an
 * {@link Organization}, but the tenant concept adds enterprise concerns:
 *
 * - **Data isolation** — all queries are implicitly scoped to the active tenant.
 * - **Billing tier** — controls feature-gating and usage limits.
 * - **Settings** — per-tenant configuration (SSO, allowed domains, etc.).
 * - **Lifecycle** — provisioning → active → suspended → deprovisioned.
 *
 * ## Isolation model
 *
 * OpenPort uses **logical tenant isolation** (shared infrastructure, tenant-
 * scoped data). Every database row that holds tenant-owned data includes a
 * `tenantId` foreign key. Authorization middleware injects the resolved
 * tenant into request context so downstream code never needs to filter
 * manually.
 *
 * ## Hierarchy
 *
 * ```
 * Tenant (isolation boundary)
 *  ├─ TenantMember[]        (see membership.ts)
 *  ├─ Team[]                (existing schema — scoped to tenant)
 *  ├─ ServiceIdentity[]     (see service-identity.ts)
 *  ├─ Role[]                (tenant-scoped custom roles)
 *  ├─ Policy[]              (tenant-scoped ABAC policies)
 *  └─ TenantSettings        (SSO, domain allow-list, feature flags)
 * ```
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * Lifecycle states of a tenant.
 *
 * - `provisioning` — initial setup (migrations, seed data) in progress.
 * - `active` — normal operation.
 * - `suspended` — billing failure or admin action; read-only access.
 * - `deprovisioned` — soft-deleted; data retained per retention policy.
 */
export type TenantStatus = "provisioning" | "active" | "suspended" | "deprovisioned";

/**
 * Billing tier that controls feature-gating and usage limits.
 * Extend this union as new tiers are introduced.
 */
export type TenantTier = "free" | "team" | "business" | "enterprise";

/**
 * The top-level isolation boundary for all tenant-scoped resources.
 *
 * Maps 1:1 to an organization but carries enterprise metadata
 * (tier, status, settings) that the bare Organization type does not.
 */
export interface Tenant {
  /** Globally unique tenant identifier. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** URL-safe slug, unique across the platform. */
  slug: string;
  /** Optional description. */
  description?: string;
  /** Current lifecycle status. */
  status: TenantStatus;
  /** Billing / feature tier. */
  tier: TenantTier;
  /** ID of the user who created the tenant. */
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** Set when status transitions to `deprovisioned`. */
  deprovisionedAt?: Date;
}

// ---------------------------------------------------------------------------
// Tenant settings
// ---------------------------------------------------------------------------

/**
 * SSO configuration for a tenant.
 *
 * When `enabled` is true, the platform enforces SSO for all members
 * of this tenant. `provider` and connection details are required.
 */
export interface TenantSSOConfig {
  enabled: boolean;
  /** SAML or OIDC. */
  provider?: "oidc";
  /** IdP entity ID (SAML) or issuer URL (OIDC). */
  issuer?: string;
  /** SSO entry-point URL. */
  entryPoint?: string;
  /** X.509 certificate for SAML signature verification. */
  certificate?: string;
  /** OIDC client ID. */
  clientId?: string;
  /** OIDC client secret — stored encrypted at rest. */
  clientSecret?: string;
}

/**
 * Per-tenant configuration that controls platform behaviour
 * for all members and service identities within the tenant.
 */
export interface TenantSettings {
  /** The tenant these settings belong to. */
  tenantId: string;
  /**
   * Email domains whose users are auto-approved on sign-up.
   * Empty array means every invitation requires manual approval.
   */
  allowedDomains: string[];
  /** SSO configuration. `null` if SSO is not configured. */
  sso: TenantSSOConfig | null;
  /** Default role assigned to new members when no explicit role is given. */
  defaultMemberRole: string;
  /**
   * Maximum number of seats (members + pending invitations).
   * `null` means unlimited (enterprise tier).
   */
  maxSeats: number | null;
  /**
   * Maximum number of service identities.
   * `null` means unlimited (enterprise tier).
   */
  maxServiceIdentities: number | null;
  /**
   * Feature flags scoped to this tenant.
   * Keys are feature names; values are booleans or JSON-serialisable config.
   */
  featureFlags: Record<string, boolean | Record<string, unknown>>;
  /** Audit log retention in days. `null` means platform default. */
  auditRetentionDays: number | null;
}

// ---------------------------------------------------------------------------
// CRUD inputs
// ---------------------------------------------------------------------------

/** Fields required to provision a new tenant. */
export interface CreateTenantInput {
  name: string;
  slug: string;
  description?: string;
  tier?: TenantTier;
  /** User ID of the creator — will be added as the first owner. */
  createdBy: string;
}

/** Mutable fields on an existing tenant. */
export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  description?: string;
  tier?: TenantTier;
}

/** Mutable fields on tenant settings. */
export type UpdateTenantSettingsInput = Partial<Omit<TenantSettings, "tenantId">>;

// ---------------------------------------------------------------------------
// Query / filtering
// ---------------------------------------------------------------------------

/** Filter criteria for listing tenants. */
export interface TenantFilter {
  status?: TenantStatus | TenantStatus[];
  tier?: TenantTier | TenantTier[];
  /** Full-text search on name and slug. */
  search?: string;
}

/** Cursor-based pagination parameters. */
export interface PaginationParams {
  /** Opaque cursor returned from a previous page. */
  cursor?: string;
  /** Maximum items to return (default: 25, max: 100). */
  limit?: number;
}

/** A page of results with cursor-based pagination metadata. */
export interface PaginatedResult<T> {
  items: T[];
  /** Cursor to pass as `cursor` for the next page. `null` if no more pages. */
  nextCursor: string | null;
  /** Total count of matching items (if the backend supports it). */
  totalCount?: number;
}

// ---------------------------------------------------------------------------
// Tenant management API
// ---------------------------------------------------------------------------

/**
 * Tenant lifecycle management.
 *
 * Implementations handle provisioning (creating DB rows, seeding defaults),
 * status transitions, settings management, and deprovisioning.
 */
export interface TenantAPI {
  /**
   * Provision a new tenant.
   *
   * Creates the tenant in `provisioning` status, seeds default settings,
   * and adds the creator as the first owner. Transitions to `active`
   * on success.
   */
  createTenant(input: CreateTenantInput): Promise<Tenant>;

  /** Retrieve a tenant by ID. Returns `null` if not found or deprovisioned. */
  getTenant(id: string): Promise<Tenant | null>;

  /** Retrieve a tenant by slug. Returns `null` if not found or deprovisioned. */
  getTenantBySlug(slug: string): Promise<Tenant | null>;

  /** List tenants with optional filters and pagination. */
  listTenants(
    filter?: TenantFilter,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Tenant>>;

  /** Update mutable fields on a tenant. */
  updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant>;

  /**
   * Suspend a tenant (e.g. billing failure).
   * Members retain read-only access; write operations are rejected.
   */
  suspendTenant(id: string, reason: string): Promise<Tenant>;

  /**
   * Re-activate a suspended tenant.
   */
  reactivateTenant(id: string): Promise<Tenant>;

  /**
   * Deprovision (soft-delete) a tenant.
   * Data is retained per the configured retention policy.
   */
  deprovisionTenant(id: string): Promise<void>;

  // -- Settings ---------------------------------------------------------------

  /** Get settings for a tenant. */
  getSettings(tenantId: string): Promise<TenantSettings>;

  /** Partially update tenant settings. */
  updateSettings(tenantId: string, data: UpdateTenantSettingsInput): Promise<TenantSettings>;
}
