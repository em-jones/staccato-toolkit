/**
 * @module membership
 *
 * Tenant membership and invitation lifecycle.
 *
 * A **TenantMember** links a {@link User} to a {@link Tenant} with one or
 * more scoped role bindings. Membership is the gate for all tenant-scoped
 * operations — a user with no membership in a tenant cannot access any of
 * its resources.
 *
 * ## Membership lifecycle
 *
 * ```
 *  Invitation (pending)
 *       │
 *       ▼
 *    accepted ──► TenantMember (active)
 *       │                │
 *       │           suspended / deactivated
 *       │                │
 *       ▼                ▼
 *    declined        removed
 * ```
 *
 * ## Role scoping
 *
 * Each member holds a **tenant-level role** (e.g. `owner`, `admin`, `member`)
 * plus optional **team-scoped roles** for fine-grained access within the
 * tenant. The effective permission set is the union of:
 *   1. Permissions granted by the tenant-level role.
 *   2. Permissions granted by each team-scoped role binding.
 *   3. Permissions granted by ABAC policies that match the member's attributes.
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** Lifecycle status of a tenant membership. */
export type MemberStatus = "active" | "suspended" | "deactivated";

/**
 * A user's membership within a tenant.
 *
 * This is the authoritative record that a user belongs to a tenant.
 * All tenant-scoped authorization checks start by loading the
 * membership for the `(userId, tenantId)` pair.
 */
export interface TenantMember {
  /** Unique membership ID. */
  id: string;
  /** The tenant this membership belongs to. */
  tenantId: string;
  /** The user this membership belongs to. */
  userId: string;
  /**
   * Tenant-level role. This is the "broadest" role the user holds
   * within the tenant. Common values: `owner`, `admin`, `member`, `viewer`.
   */
  role: string;
  /** Current lifecycle status. */
  status: MemberStatus;
  /** When the user joined (accepted the invitation or was directly added). */
  joinedAt: Date;
  /** ID of the user who added or invited this member. */
  invitedBy?: string;
  updatedAt: Date;
}

/**
 * An additional role binding scoped to a team within a tenant.
 *
 * Team-scoped roles layer on top of the tenant-level role and allow
 * fine-grained delegation without elevating the member's tenant-wide
 * permissions.
 */
export interface TeamRoleBinding {
  /** Unique binding ID. */
  id: string;
  /** Membership this binding extends. */
  membershipId: string;
  /** Team this binding is scoped to. */
  teamId: string;
  /** Role granted within the team. */
  role: string;
  /** When the binding was created. */
  grantedAt: Date;
  /** Who granted this binding. */
  grantedBy?: string;
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

/** Lifecycle status of an invitation. */
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired" | "revoked";

/**
 * An invitation for a user to join a tenant.
 *
 * Invitations are sent to an email address and may target an existing user
 * or a new sign-up. The invitation carries the role(s) the member will
 * receive upon acceptance.
 */
export interface TenantInvitation {
  /** Unique invitation ID. */
  id: string;
  /** The tenant the user is being invited to. */
  tenantId: string;
  /** Email address of the invitee. */
  email: string;
  /** Tenant-level role to assign on acceptance. */
  role: string;
  /** Optional team-scoped role bindings to assign on acceptance. */
  teamRoles?: Array<{ teamId: string; role: string }>;
  /** Current lifecycle status. */
  status: InvitationStatus;
  /** Cryptographic token used in the invitation link. */
  token: string;
  /** When the invitation expires. */
  expiresAt: Date;
  /** Who sent the invitation. */
  invitedBy: string;
  createdAt: Date;
  /** Set when the invitation is accepted or declined. */
  respondedAt?: Date;
}

// ---------------------------------------------------------------------------
// CRUD inputs
// ---------------------------------------------------------------------------

/** Fields for inviting a user to a tenant. */
export interface InviteMemberInput {
  /** Email address of the invitee. */
  email: string;
  /** Tenant-level role to assign on acceptance. */
  role: string;
  /** Optional team-scoped role bindings. */
  teamRoles?: Array<{ teamId: string; role: string }>;
  /**
   * Custom message included in the invitation email.
   * Markdown is supported.
   */
  message?: string;
}

/** Fields for directly adding a member (bypasses invitation flow). */
export interface AddMemberInput {
  /** User ID to add. The user must already exist. */
  userId: string;
  /** Tenant-level role. */
  role: string;
  /** Optional team-scoped role bindings. */
  teamRoles?: Array<{ teamId: string; role: string }>;
}

/** Fields for updating a member's role or status. */
export interface UpdateMemberInput {
  /** New tenant-level role. */
  role?: string;
  /** New lifecycle status. */
  status?: MemberStatus;
}

// ---------------------------------------------------------------------------
// Query / filtering
// ---------------------------------------------------------------------------

/** Filter criteria for listing members within a tenant. */
export interface MemberFilter {
  /** Filter by lifecycle status. */
  status?: MemberStatus | MemberStatus[];
  /** Filter by tenant-level role. */
  role?: string | string[];
  /** Full-text search on user name or email. */
  search?: string;
  /** Filter to members who belong to a specific team. */
  teamId?: string;
}

/** Filter criteria for listing invitations. */
export interface InvitationFilter {
  status?: InvitationStatus | InvitationStatus[];
  /** Full-text search on invitee email. */
  search?: string;
}

// ---------------------------------------------------------------------------
// Membership API
// ---------------------------------------------------------------------------

import type { PaginationParams, PaginatedResult } from "./tenant.ts";

/**
 * Tenant membership and invitation management.
 *
 * All methods are scoped to a single tenant (identified by `tenantId`).
 */
export interface MembershipAPI {
  // -- Members ----------------------------------------------------------------

  /**
   * Directly add a user as a member of a tenant.
   * Use for admin-initiated additions; for email-based flows use
   * {@link inviteMember}.
   */
  addMember(tenantId: string, input: AddMemberInput): Promise<TenantMember>;

  /** Get a specific membership by ID. */
  getMember(tenantId: string, membershipId: string): Promise<TenantMember | null>;

  /** Get the membership for a specific user within a tenant. */
  getMemberByUser(tenantId: string, userId: string): Promise<TenantMember | null>;

  /** List members with optional filters and pagination. */
  listMembers(
    tenantId: string,
    filter?: MemberFilter,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<TenantMember>>;

  /** Update a member's role or status. */
  updateMember(
    tenantId: string,
    membershipId: string,
    data: UpdateMemberInput,
  ): Promise<TenantMember>;

  /**
   * Remove a member from a tenant.
   * Also removes all team-scoped role bindings for this membership.
   */
  removeMember(tenantId: string, membershipId: string): Promise<void>;

  /**
   * Transfer ownership of a tenant to another member.
   * The current owner is demoted to `admin`.
   */
  transferOwnership(tenantId: string, newOwnerMembershipId: string): Promise<void>;

  // -- Team role bindings -----------------------------------------------------

  /** Add a team-scoped role binding to an existing membership. */
  addTeamRole(membershipId: string, teamId: string, role: string): Promise<TeamRoleBinding>;

  /** Remove a team-scoped role binding. */
  removeTeamRole(bindingId: string): Promise<void>;

  /** List team-scoped role bindings for a membership. */
  listTeamRoles(membershipId: string): Promise<TeamRoleBinding[]>;

  // -- Invitations ------------------------------------------------------------

  /**
   * Send an invitation to an email address.
   *
   * If the email matches an existing user, they receive a notification.
   * If not, the invitation link includes a sign-up flow that auto-joins
   * the tenant on completion.
   *
   * Throws if the tenant has reached its `maxSeats` limit.
   */
  inviteMember(tenantId: string, input: InviteMemberInput): Promise<TenantInvitation>;

  /** Accept an invitation by its token. */
  acceptInvitation(token: string): Promise<TenantMember>;

  /** Decline an invitation by its token. */
  declineInvitation(token: string): Promise<void>;

  /** Revoke a pending invitation (admin action). */
  revokeInvitation(invitationId: string): Promise<void>;

  /** Re-send the invitation email (resets expiry). */
  resendInvitation(invitationId: string): Promise<TenantInvitation>;

  /** List invitations for a tenant with optional filters. */
  listInvitations(
    tenantId: string,
    filter?: InvitationFilter,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<TenantInvitation>>;

  // -- Queries ----------------------------------------------------------------

  /** List all tenants a user is a member of. */
  listTenantsForUser(userId: string): Promise<TenantMember[]>;

  /**
   * Count current members + pending invitations.
   * Used for enforcing seat limits.
   */
  countSeats(tenantId: string): Promise<{ members: number; pendingInvitations: number }>;
}
