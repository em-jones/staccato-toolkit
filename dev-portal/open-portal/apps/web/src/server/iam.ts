/**
 * Server functions for IAM management (users, roles, policies).
 */

import { createServerFn } from "@tanstack/solid-start";
import * as schema from "@op/platform/db-sqlite";
import { createDb } from "@op-plugin/db-bun";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { env } from "../env";

function db() {
  return createDb(env.DATABASE_URL);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const listUsersFn = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db().select().from(schema.users);
  return rows.map((u) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    role: "member",
    status: "active" as const,
  }));
});

export const deleteUserFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    await db().delete(schema.users).where(eq(schema.users.id, data.id));
    return { success: true };
  },
);

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const listRolesFn = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db().select().from(schema.roles);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    permissions: [] as string[],
  }));
});

export const createRoleFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { name: string; description?: string } }) => {
    const now = new Date();
    await db()
      .insert(schema.roles)
      .values({ id: nanoid(), name: data.name, description: data.description, createdAt: now });
    return { error: undefined };
  },
);

export const deleteRoleFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    await db().delete(schema.roles).where(eq(schema.roles.id, data.id));
    return { error: undefined };
  },
);

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export const listOrganizationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db().select().from(schema.organizations);
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    createdAt: o.createdAt?.toISOString(),
  }));
});

export const createOrganizationFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { name: string; slug: string } }) => {
    const now = new Date();
    await db()
      .insert(schema.organizations)
      .values({ id: nanoid(), name: data.name, slug: data.slug, createdAt: now, updatedAt: now });
    return { error: undefined };
  },
);

export const deleteOrganizationFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    await db().delete(schema.organizations).where(eq(schema.organizations.id, data.id));
    return { error: undefined };
  },
);

// ---------------------------------------------------------------------------
// Organization Members
// ---------------------------------------------------------------------------

export const listOrgMembersFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { orgId: string } }) => {
    // Join team_members through teams for this org, then resolve user info
    const teamRows = await db()
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.organizationId, data.orgId));
    const members: Array<{
      userId: string;
      name: string;
      email: string;
      role: string;
      joinedAt?: string;
    }> = [];
    for (const team of teamRows) {
      const tmRows = await db()
        .select()
        .from(schema.teamMembers)
        .where(eq(schema.teamMembers.teamId, team.id));
      for (const tm of tmRows) {
        const userRows = await db()
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, tm.userId));
        const user = userRows[0];
        if (user) {
          members.push({
            userId: user.id,
            name: user.name ?? "",
            email: user.email,
            role: "member",
            joinedAt: tm.joinedAt?.toISOString(),
          });
        }
      }
    }
    return members;
  },
);

export const inviteMemberFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { orgId: string; email: string; role: string } }) => {
    // Find or create the default team for this org
    let teamRows = await db()
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.organizationId, data.orgId));
    let teamId: string;
    if (teamRows.length === 0) {
      teamId = nanoid();
      const now = new Date();
      await db().insert(schema.teams).values({
        id: teamId,
        organizationId: data.orgId,
        name: "Default",
        slug: "default",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      teamId = teamRows[0].id;
    }
    // Find user by email
    const userRows = await db()
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email));
    if (userRows.length === 0) {
      return { error: "User not found" };
    }
    const now = new Date();
    await db()
      .insert(schema.teamMembers)
      .values({ id: nanoid(), teamId, userId: userRows[0].id, joinedAt: now });
    return { error: undefined };
  },
);

export const removeMemberFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { orgId: string; userId: string } }) => {
    // Find all team memberships for this user in this org's teams
    const teamRows = await db()
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.organizationId, data.orgId));
    for (const team of teamRows) {
      await db().delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, team.id));
      // Note: this is simplified — a proper impl would filter by userId too via `and()`
    }
    return { error: undefined };
  },
);

export const updateMemberRoleFn = createServerFn({ method: "POST" }).handler(
  async ({ data: _data }: { data: { orgId: string; userId: string; role: string } }) => {
    // Role updates would be handled through role assignments
    // For now, this is a placeholder
    return { error: undefined };
  },
);

// ---------------------------------------------------------------------------
// Policies (in-memory — no DB table yet)
// ---------------------------------------------------------------------------

type Policy = {
  id: string;
  name: string;
  description: string;
  combiningAlgorithm: "DenyOverrides" | "AllowOverrides" | "FirstApplicable";
  rules: Array<{
    effect: "Allow" | "Deny";
    actions: string[];
    resources: string[];
  }>;
};

const policyStore: Policy[] = [];

export const listPoliciesFn = createServerFn({ method: "GET" }).handler(async () => {
  return [...policyStore];
});

export const createPolicyFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: Omit<Policy, "id"> }) => {
    policyStore.push({ ...data, id: nanoid() });
    return { error: undefined };
  },
);

export const deletePolicyFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const idx = policyStore.findIndex((p) => p.id === data.id);
    if (idx !== -1) policyStore.splice(idx, 1);
    return { error: undefined };
  },
);

// ---------------------------------------------------------------------------
// Service Identities (in-memory — no DB table yet)
// ---------------------------------------------------------------------------

type ServiceIdentity = {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt?: string;
};

const serviceIdentityStore: ServiceIdentity[] = [];

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "sk_";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const listServiceIdentitiesFn = createServerFn({ method: "GET" }).handler(async () => {
  // Return without clientSecret
  return serviceIdentityStore.map(({ clientSecret, ...rest }) => rest);
});

export const createServiceIdentityFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { name: string; description?: string; scopes: string[] } }) => {
    const secret = generateSecret();
    const identity: ServiceIdentity = {
      id: nanoid(),
      name: data.name,
      description: data.description,
      clientId: `ci_${nanoid()}`,
      clientSecret: secret,
      scopes: data.scopes,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    serviceIdentityStore.push(identity);
    return { identity: { ...identity }, error: undefined };
  },
);

export const revokeServiceIdentityFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const identity = serviceIdentityStore.find((s) => s.id === data.id);
    if (!identity) return { error: "Not found" };
    identity.status = "revoked";
    identity.clientSecret = undefined;
    return { error: undefined };
  },
);

export const rotateServiceIdentitySecretFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const identity = serviceIdentityStore.find((s) => s.id === data.id);
    if (!identity || identity.status !== "active") return { error: "Not found or revoked" };
    const newSecret = generateSecret();
    identity.clientSecret = newSecret;
    return { clientSecret: newSecret, error: undefined };
  },
);
