/**
 * @module service-identity
 *
 * Machine-to-machine credentials scoped to a tenant.
 *
 * A **ServiceIdentity** represents a non-human actor (CI pipeline, external
 * integration, background worker) that authenticates via client credentials
 * (client ID + client secret) rather than a user session.
 *
 * ## Security model
 *
 * - Credentials are scoped to a single tenant and inherit no cross-tenant
 *   access, even if the creating user has memberships in multiple tenants.
 * - Each identity holds a set of **scopes** that act as an upper bound on
 *   its permissions. The effective permission set is the intersection of
 *   the identity's scopes and the permissions available in the tenant.
 * - Client secrets are hashed at rest. The plaintext is returned exactly
 *   once — at creation or rotation — and cannot be retrieved afterward.
 * - Secrets can be rotated with a configurable **grace period** during
 *   which both old and new secrets are accepted. This allows zero-downtime
 *   credential rotation in distributed systems.
 *
 * ## Lifecycle
 *
 * ```
 * created (active)
 *     │
 *     ├─ rotate ──► new secret (grace period for old)
 *     │
 *     ├─ suspend ──► suspended (credentials rejected)
 *     │                  │
 *     │              reactivate ──► active
 *     │
 *     └─ revoke ──► revoked (terminal — credentials destroyed)
 * ```
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** Lifecycle status of a service identity. */
export type ServiceIdentityStatus = "active" | "suspended" | "revoked";

/**
 * A machine-to-machine credential set scoped to a tenant.
 *
 * **Note:** `clientSecret` is never stored or returned in plaintext after
 * creation. The `hashedSecret` field is internal to the persistence layer.
 */
export interface ServiceIdentity {
  /** Unique identity ID. */
  id: string;
  /** Tenant this identity belongs to. */
  tenantId: string;
  /** Human-readable name (e.g. "CI Pipeline", "Grafana Reader"). */
  name: string;
  /** Optional description. */
  description?: string;
  /** OAuth2-style client ID used for authentication. */
  clientId: string;
  /**
   * Permission scopes granted to this identity.
   * Uses the same resource.action format as the platform permission system.
   */
  scopes: string[];
  /** Current lifecycle status. */
  status: ServiceIdentityStatus;
  /** Who created this identity. */
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** When the current secret was last rotated. */
  lastRotatedAt?: Date;
  /** When this identity was last used to authenticate. */
  lastUsedAt?: Date;
  /** When the current secret expires (if expiry is configured). */
  secretExpiresAt?: Date;
}

/**
 * The result of creating or rotating a service identity.
 *
 * The `clientSecret` is included in plaintext **only** in this response.
 * Callers must present it to the end user immediately; it cannot be
 * retrieved again.
 */
export interface ServiceIdentityWithSecret extends ServiceIdentity {
  /** Plaintext client secret — shown once, then discarded. */
  clientSecret: string;
}

// ---------------------------------------------------------------------------
// CRUD inputs
// ---------------------------------------------------------------------------

/** Fields required to create a new service identity. */
export interface CreateServiceIdentityInput {
  /** Human-readable name. */
  name: string;
  /** Optional description. */
  description?: string;
  /** Permission scopes to grant. */
  scopes: string[];
  /**
   * Secret expiry in days. `null` means no expiry.
   * Enterprise tenants may enforce a maximum via tenant settings.
   */
  expiresInDays?: number | null;
}

/** Mutable fields on an existing service identity. */
export interface UpdateServiceIdentityInput {
  name?: string;
  description?: string;
  scopes?: string[];
}

/** Options for secret rotation. */
export interface RotateSecretOptions {
  /**
   * Grace period in seconds during which both old and new secrets
   * are accepted. Default: 0 (immediate rotation).
   *
   * Recommended: 300 (5 minutes) for distributed systems.
   */
  gracePeriodSeconds?: number;
  /** Expiry in days for the new secret. */
  expiresInDays?: number | null;
}

// ---------------------------------------------------------------------------
// Query / filtering
// ---------------------------------------------------------------------------

/** Filter criteria for listing service identities within a tenant. */
export interface ServiceIdentityFilter {
  status?: ServiceIdentityStatus | ServiceIdentityStatus[];
  /** Full-text search on name and description. */
  search?: string;
  /** Filter to identities with a specific scope. */
  scope?: string;
  /** Filter to identities whose secret expires before this date. */
  secretExpiresBefore?: Date;
}

// ---------------------------------------------------------------------------
// Service Identity API
// ---------------------------------------------------------------------------

import type { PaginationParams, PaginatedResult } from "./tenant.ts";

/**
 * Service identity lifecycle management.
 *
 * All methods are scoped to a single tenant.
 */
export interface ServiceIdentityAPI {
  /**
   * Create a new service identity.
   *
   * Returns the identity **with the plaintext secret**. This is the only
   * time the secret is available in cleartext.
   *
   * Throws if the tenant has reached its `maxServiceIdentities` limit.
   */
  createIdentity(
    tenantId: string,
    input: CreateServiceIdentityInput,
  ): Promise<ServiceIdentityWithSecret>;

  /** Retrieve an identity by ID (without the secret). */
  getIdentity(tenantId: string, identityId: string): Promise<ServiceIdentity | null>;

  /** List identities with optional filters and pagination. */
  listIdentities(
    tenantId: string,
    filter?: ServiceIdentityFilter,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<ServiceIdentity>>;

  /** Update mutable fields on an identity. */
  updateIdentity(
    tenantId: string,
    identityId: string,
    data: UpdateServiceIdentityInput,
  ): Promise<ServiceIdentity>;

  /**
   * Rotate the client secret.
   *
   * Returns the new plaintext secret. If `gracePeriodSeconds` is set,
   * the old secret remains valid for that duration.
   */
  rotateSecret(
    tenantId: string,
    identityId: string,
    options?: RotateSecretOptions,
  ): Promise<ServiceIdentityWithSecret>;

  /**
   * Suspend an identity. Credentials are rejected until reactivated.
   */
  suspendIdentity(tenantId: string, identityId: string): Promise<ServiceIdentity>;

  /**
   * Reactivate a suspended identity.
   */
  reactivateIdentity(tenantId: string, identityId: string): Promise<ServiceIdentity>;

  /**
   * Permanently revoke an identity. This is irreversible — the secret
   * is destroyed and the identity cannot be reactivated.
   */
  revokeIdentity(tenantId: string, identityId: string): Promise<void>;

  /**
   * Validate a client credential pair.
   *
   * Returns the identity if the credentials are valid and the identity
   * is active. Returns `null` otherwise. Updates `lastUsedAt` on success.
   */
  validateCredentials(clientId: string, clientSecret: string): Promise<ServiceIdentity | null>;
}
