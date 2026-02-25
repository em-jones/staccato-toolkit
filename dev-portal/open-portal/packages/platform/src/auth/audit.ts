/**
 * @module audit
 *
 * Tenant-scoped audit logging.
 *
 * Every state-changing operation within a tenant produces an **AuditEntry**.
 * The audit log is append-only and immutable — entries cannot be modified
 * or deleted through the API (retention is handled by background jobs
 * according to {@link TenantSettings.auditRetentionDays}).
 *
 * ## Event categories
 *
 * | Category        | Examples                                          |
 * |-----------------|---------------------------------------------------|
 * | `auth`          | sign-in, sign-out, password reset, SSO login       |
 * | `membership`    | member added, removed, role changed, invitation    |
 * | `tenant`        | settings changed, suspended, tier upgraded         |
 * | `rbac`          | role created, permission changed, policy updated   |
 * | `service`       | identity created, secret rotated, revoked          |
 * | `resource`      | catalog entity created, team modified              |
 *
 * ## Actor types
 *
 * An audit entry records **who** performed the action:
 * - `user` — a human user authenticated via session.
 * - `service` — a service identity authenticated via client credentials.
 * - `system` — an automated platform action (e.g. secret expiry, retention).
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** The category of an auditable event. */
export type AuditCategory = "auth" | "membership" | "tenant" | "rbac" | "service" | "resource";

/** The type of actor that performed the action. */
export type ActorType = "user" | "service" | "system";

/**
 * Identifies the actor who performed an audited action.
 */
export interface AuditActor {
  /** Type of actor. */
  type: ActorType;
  /**
   * Unique ID of the actor:
   * - User ID for `user` actors.
   * - Service identity ID for `service` actors.
   * - `"system"` for `system` actors.
   */
  id: string;
  /** Human-readable display name (user name, service identity name). */
  displayName?: string;
  /** IP address from which the action was performed (if available). */
  ipAddress?: string;
  /** User-Agent string (if available). */
  userAgent?: string;
}

/**
 * Identifies the resource that was affected by the action.
 */
export interface AuditTarget {
  /** Resource type (e.g. `"user"`, `"role"`, `"service-identity"`, `"team"`). */
  type: string;
  /** Resource ID. */
  id: string;
  /** Human-readable label (e.g. user email, role name). */
  displayName?: string;
}

/**
 * A single, immutable audit log entry.
 *
 * Audit entries are scoped to a tenant and ordered by timestamp.
 * The `details` field carries action-specific structured data.
 */
export interface AuditEntry {
  /** Unique entry ID. */
  id: string;
  /** Tenant this entry belongs to. */
  tenantId: string;
  /** Event category. */
  category: AuditCategory;
  /**
   * Dot-delimited action identifier within the category.
   * Convention: `category.noun.verb` (e.g. `membership.member.added`,
   * `rbac.role.updated`, `auth.session.created`).
   */
  action: string;
  /** Who performed the action. */
  actor: AuditActor;
  /** The primary resource affected. */
  target?: AuditTarget;
  /** Action-specific structured data (before/after values, parameters). */
  details?: Record<string, unknown>;
  /**
   * Outcome of the action.
   * - `success` — completed normally.
   * - `failure` — attempted but failed (e.g. permission denied, validation error).
   */
  outcome: "success" | "failure";
  /** Error message when `outcome` is `failure`. */
  errorMessage?: string;
  /** ISO 8601 timestamp. */
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// CRUD inputs
// ---------------------------------------------------------------------------

/** Fields for creating an audit entry (internal — used by the platform). */
export interface CreateAuditEntryInput {
  tenantId: string;
  category: AuditCategory;
  action: string;
  actor: AuditActor;
  target?: AuditTarget;
  details?: Record<string, unknown>;
  outcome: "success" | "failure";
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Query / filtering
// ---------------------------------------------------------------------------

/** Filter criteria for querying the audit log. */
export interface AuditFilter {
  /** Filter by event category. */
  category?: AuditCategory | AuditCategory[];
  /** Filter by action (supports prefix matching, e.g. `"membership.*"`). */
  action?: string;
  /** Filter by actor ID. */
  actorId?: string;
  /** Filter by actor type. */
  actorType?: ActorType;
  /** Filter by target resource type. */
  targetType?: string;
  /** Filter by target resource ID. */
  targetId?: string;
  /** Filter by outcome. */
  outcome?: "success" | "failure";
  /** Entries created at or after this timestamp. */
  from?: Date;
  /** Entries created at or before this timestamp. */
  to?: Date;
}

// ---------------------------------------------------------------------------
// Audit API
// ---------------------------------------------------------------------------

import type { PaginationParams, PaginatedResult } from "./tenant.ts";

/**
 * Audit log query interface.
 *
 * The write side ({@link CreateAuditEntryInput}) is internal to the platform —
 * plugins and middleware emit audit entries through the event hub. This API
 * exposes the **read** side for admin dashboards and compliance exports.
 */
export interface AuditAPI {
  /** Query audit entries with filters and cursor-based pagination. */
  listEntries(
    tenantId: string,
    filter?: AuditFilter,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<AuditEntry>>;

  /** Retrieve a single audit entry by ID. */
  getEntry(tenantId: string, entryId: string): Promise<AuditEntry | null>;

  /**
   * Export audit entries as a newline-delimited JSON stream.
   *
   * Intended for compliance exports and SIEM ingestion.
   * Returns an async iterable of serialised entries.
   */
  exportEntries(tenantId: string, filter?: AuditFilter): AsyncIterable<string>;

  /**
   * Get a summary of audit activity for a tenant.
   *
   * Useful for dashboard widgets — returns counts by category and
   * outcome over a time range.
   */
  getSummary(tenantId: string, from: Date, to: Date): Promise<AuditSummary>;
}

/**
 * Aggregate audit statistics over a time range.
 */
export interface AuditSummary {
  /** Total number of entries in the time range. */
  totalEntries: number;
  /** Breakdown by category. */
  byCategory: Record<AuditCategory, number>;
  /** Breakdown by outcome. */
  byOutcome: { success: number; failure: number };
  /** Top 10 most frequent actions. */
  topActions: Array<{ action: string; count: number }>;
  /** Time range covered. */
  from: Date;
  to: Date;
}
