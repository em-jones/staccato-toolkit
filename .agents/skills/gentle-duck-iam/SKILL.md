---
name: gentle-duck-iam
description: >
  Type-safe hybrid RBAC + ABAC access control engine for TypeScript using @gentleduck/iam.
  Use when implementing authorization, permissions, roles, policies, access control,
  multi-tenant scoped roles, or attribute-based conditions in TypeScript applications.
  ALWAYS use this skill when writing code that imports from "@gentleduck/iam" or "duck-iam",
  when designing permission schemas, defining roles with inheritance, building ABAC policies
  with condition builders, configuring the evaluation engine, or debugging authorization decisions.
  Also use when the user asks about RBAC vs ABAC hybrid approaches, policy combining algorithms,
  owner-only access patterns, or defense-in-depth authorization layers.
---

## Overview

`@gentleduck/iam` is a hybrid access control engine that combines Role-Based Access Control
(RBAC) and Attribute-Based Access Control (ABAC) into a single unified evaluator. Roles are
internally converted into ABAC policies, so every authorization check goes through one pipeline
regardless of whether the permission came from a role definition or a hand-written policy.

**Package:** `@gentleduck/iam`
**Docs:** https://iam.gentleduck.org/
**Repo:** https://github.com/gentleeduck/duck-iam
**License:** MIT

### Key Design Principles

- Roles and policies coexist; roles are converted to ABAC policies internally
- Cross-policy AND-combination: every policy must allow for the final decision to be "allow"
- Defense-in-depth: layer RBAC (who), time-based (when), geo (where), content (what) policies
- Type-safe: `createAccessConfig()` constrains all actions, resources, roles, and scopes at compile time
- Custom context types enable typed dot-path intellisense on condition builders
- Pluggable storage via the Adapter interface (Memory, Drizzle, Prisma, HTTP built-in)
- Framework integrations for React, Vue, vanilla JS (client) and Express, Hono, NestJS, Next.js (server)

---

## Architecture

```
User + Context
    |
    v
Roles converted to Policy (internally)
    |
    v
All Policies Evaluated (ABAC engine)
    |
    v
Conditions Checked
    |
    v
AND-Combined Decision (all policies must allow)
```

---

## Core Concepts

### Actions, Resources, Roles, Scopes

These are the four dimensions of the permission model:

- **Action**: what the subject wants to do (`create`, `read`, `update`, `delete`, `manage`, etc.)
- **Resource**: what the action targets (`post`, `comment`, `user`, `dashboard`, etc.)
- **Role**: a named collection of permissions (`viewer`, `editor`, `admin`)
- **Scope**: optional namespace for multi-tenant isolation (`org-acme`, `workspace-1`)

### AccessRequest

Every authorization check resolves to an `AccessRequest`:

```typescript
interface AccessRequest {
  subject: ResolvedSubject; // user + roles + attributes
  action: string;
  resource: Resource; // { type, id?, attributes }
  environment?: Environment; // { ip?, hour?, custom fields }
  scope?: string;
}
```

### Policy

A named collection of rules with a combining algorithm:

```typescript
interface Policy {
  id: string;
  name: string;
  description?: string;
  version?: number;
  algorithm: CombiningAlgorithm; // 'deny-overrides' | 'allow-overrides' | 'first-match' | 'highest-priority'
  rules: readonly Rule[];
  targets?: {
    actions?: readonly string[];
    resources?: readonly string[];
    roles?: readonly string[];
  };
}
```

Policies can have **targets** that scope them to specific actions, resources, or roles.
If a request does not match a policy's targets, that policy's rules are not evaluated.

### Combining Algorithms

Each policy uses a combining algorithm to resolve conflicts when multiple rules match:

| Algorithm                  | Behavior                                                      |
| -------------------------- | ------------------------------------------------------------- |
| `deny-overrides` (default) | Any DENY wins. Safest choice.                                 |
| `allow-overrides`          | Any ALLOW wins. Used internally by the RBAC-generated policy. |
| `first-match`              | First matching rule wins (order matters).                     |
| `highest-priority`         | Rule with the highest priority number wins.                   |

**Across policies**, duck-iam uses strict AND-combination: every policy must allow the
request for the final decision to be `allow`. A deny from any single policy is final.

---

## Typed Permission Schema with createAccessConfig

`createAccessConfig()` constrains all builders and engine methods to your schema at compile
time, catching typos and invalid references before runtime.

```typescript
import { createAccessConfig } from "@gentleduck/iam";

const access = createAccessConfig({
  actions: ["create", "read", "update", "delete", "publish", "manage"] as const,
  resources: ["post", "comment", "user", "analytics", "settings"] as const,
  scopes: ["org-acme", "org-globex"] as const,
  roles: ["viewer", "author", "editor", "admin"] as const,
});
```

### Custom Context for Typed Dot-Path Intellisense

Pass a phantom `context` field to enable full autocomplete on `.attr()`, `.resourceAttr()`,
`.env()`, and `.check()` condition builders:

```typescript
interface AppContext {
  action: string;
  subject: {
    id: string;
    roles: string[];
    attributes: { department: string; tier: "free" | "premium" };
  };
  resource: {
    type: string;
    id?: string;
    attributes: { ownerId: string; status: "draft" | "published" };
  };
  environment: { hour: number; ip: string; maintenanceMode: boolean };
  scope: string;
  // Per-resource attribute narrowing (optional):
  resourceAttributes: {
    post: { ownerId: string; status: "draft" | "published"; title: string };
    comment: { ownerId: string; body: string };
  };
}

const access = createAccessConfig({
  actions: ["create", "read", "update", "delete"] as const,
  resources: ["post", "comment", "user"] as const,
  roles: ["viewer", "editor", "admin"] as const,
  context: {} as unknown as AppContext,
});
// Now w.attr('department', 'eq', ...) autocompletes 'department' and constrains values
// w.resourceAttr('status', 'eq', ...) gives 'draft' | 'published' for post rules
```

### AccessConfig Methods

| Method                          | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `access.defineRole(id)`         | Create a typed role builder                     |
| `access.policy(id)`             | Create a typed policy builder                   |
| `access.defineRule(id)`         | Create a typed standalone rule builder          |
| `access.when()`                 | Create a typed standalone condition builder     |
| `access.createEngine(config)`   | Create a typed engine instance                  |
| `access.checks(arr)`            | Type-constrain an array of permission checks    |
| `access.validateRoles(roles)`   | Runtime validation for role definitions         |
| `access.validatePolicy(policy)` | Runtime validation for untrusted policy objects |

### Inference Helpers

Extract union types from a config input for use in external code:

```typescript
type AppAction = InferAction<typeof configInput>; // 'create' | 'read' | ...
type AppResource = InferResource<typeof configInput>; // 'post' | 'comment' | ...
type AppScope = InferScope<typeof configInput>; // 'org-acme' | 'org-globex'
type AppRole = InferRole<typeof configInput>; // 'viewer' | 'editor' | 'admin'
```

---

## Roles

### Defining Roles

```typescript
const viewer = access
  .defineRole("viewer")
  .name("Viewer")
  .grant("read", "post")
  .grant("read", "comment")
  .build();

const editor = access
  .defineRole("editor")
  .name("Editor")
  .inherits("viewer")
  .grant("create", "post")
  .grant("update", "post")
  .grant("delete", "post")
  .build();

const admin = access
  .defineRole("admin")
  .name("Admin")
  .inherits("editor")
  .grantAll("*") // all actions on all resources
  .build();
```

### Role Inheritance

Roles can inherit from other roles. Inheritance chains can be arbitrarily deep.
An admin gets everything an editor can do (which includes everything a viewer can do).

### Conditional Permissions with grantWhen

Attach conditions to individual permissions:

```typescript
const author = defineRole("author")
  .name("Author")
  .grant("create", "post")
  .grant("read", "post")
  .grantWhen("update", "post", (w) => w.isOwner())
  .grantWhen("delete", "post", (w) => w.isOwner())
  .build();
```

`isOwner()` generates a condition checking `resource.attributes.ownerId eq $subject.id`.

### Scoped Roles (Multi-Tenancy)

Three mechanisms for multi-tenant role scoping:

1. **Role-level scope**: all permissions in the role are scoped
2. **Permission-level scope** via `grantScoped(scope, action, resource)`
3. **Scoped role assignments**: same role, different scope per user

```typescript
// Scoped role assignment via engine admin API
await engine.admin.assignRole("user-alice", "admin", "org-1");
await engine.admin.assignRole("user-alice", "viewer", "org-2");

// Check with scope
await engine.can("user-alice", "manage", { type: "team", attributes: {} }, undefined, "org-1");
// -> true (admin in org-1)

await engine.can("user-alice", "manage", { type: "team", attributes: {} }, undefined, "org-2");
// -> false (only viewer in org-2)
```

### Role Shorthand Methods

| Method                                 | Description                                               |
| -------------------------------------- | --------------------------------------------------------- |
| `grant(action, resource)`              | Grant a single permission                                 |
| `grantAll(resource)`                   | Grant all actions on a resource (or `'*'` for everything) |
| `grantWhen(action, resource, whenFn)`  | Grant with conditions                                     |
| `grantScoped(scope, action, resource)` | Grant scoped to a tenant                                  |
| `inherits(roleId)`                     | Inherit all permissions from another role                 |
| `build()`                              | Produce the final `Role` object                           |

---

## Policies

### Building Policies

```typescript
const ownerPolicy = access
  .policy("owner-only")
  .name("Owner Only")
  .algorithm("deny-overrides")
  .rule("owner-update", (r) =>
    r
      .allow()
      .on("update")
      .of("post")
      .priority(10)
      .when((w) => w.isOwner()),
  )
  .rule("deny-non-owner-delete", (r) =>
    r
      .deny()
      .on("delete")
      .of("post")
      .priority(20)
      .when((w) => w.check("resource.attributes.ownerId", "neq", "$subject.id")),
  )
  .build();
```

### Policy Builder Methods

| Method          | Description                                               |
| --------------- | --------------------------------------------------------- |
| `name(n)`       | Human-readable name                                       |
| `desc(d)`       | Optional description                                      |
| `version(v)`    | Version number for change tracking                        |
| `algorithm(a)`  | Combining algorithm (default: `'deny-overrides'`)         |
| `target(t)`     | Scope the policy to specific actions, resources, or roles |
| `rule(id, fn)`  | Add a rule using an inline builder                        |
| `addRule(rule)` | Add a pre-built `Rule` object                             |
| `build()`       | Produce the final `Policy` object                         |

### Standalone Rule Builder

Build rules outside of policies for composition:

```typescript
const ownerRule = access
  .defineRule("owner-check")
  .allow()
  .on("update", "delete")
  .of("post")
  .when((w) => w.isOwner())
  .build();

// Use in multiple policies
const policy1 = access.policy("p1").addRule(ownerRule).build();
const policy2 = access.policy("p2").addRule(ownerRule).build();
```

### Rule Builder Methods

| Method                | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `allow()`             | Set effect to `allow` (default)                                        |
| `deny()`              | Set effect to `deny`                                                   |
| `on(...actions)`      | Actions this rule applies to (default: `['*']`)                        |
| `of(...resources)`    | Resources this rule applies to (default: `['*']`)                      |
| `priority(p)`         | Numeric priority (default: `10`). Higher wins with `highest-priority`. |
| `when(fn)`            | Conditions that must ALL be true (AND logic)                           |
| `whenAny(fn)`         | Conditions where ANY can be true (OR logic)                            |
| `forScope(...scopes)` | Restrict to specific scopes                                            |
| `meta(m)`             | Arbitrary metadata                                                     |
| `build()`             | Produce the final `Rule` object                                        |

### Wildcards

Both actions and resources support wildcards (`'*'`). Resources also support hierarchical
matching: a rule targeting `"dashboard"` matches `"dashboard.users"` and
`"dashboard.users.settings"`.

---

## Conditions: The When Builder

The `When` builder defines conditions for rules. By default, all conditions are AND-combined.

### Raw Condition Check

```typescript
.when(w => w.check('resource.attributes.status', 'eq', 'published'))
```

### Shorthand Operator Methods

```typescript
.when(w => w
  .eq('subject.attributes.department', 'engineering')
  .neq('resource.attributes.status', 'archived')
  .gt('environment.hour', 9)
  .gte('subject.attributes.level', 5)
  .lt('environment.hour', 17)
  .lte('resource.attributes.priority', 3)
  .in('subject.attributes.region', ['us', 'eu', 'ap'])
  .contains('subject.roles', 'admin')
  .exists('resource.attributes.approvedAt')
  .matches('resource.attributes.email', '^[a-z]+@example\\.com$')
)
```

### Domain-Specific Shortcuts

These shortcuts auto-prefix the field path for ergonomic access:

```typescript
// Subject attributes — auto-prefixes 'subject.attributes.'
.when(w => w.attr('department', 'eq', 'engineering'))
.when(w => w.attr('tier', 'in', ['premium', 'enterprise']))

// Resource attributes — auto-prefixes 'resource.attributes.'
.when(w => w.resourceAttr('status', 'eq', 'published'))
.when(w => w.resourceAttr('ownerId', 'eq', '$subject.id'))

// Environment attributes — auto-prefixes 'environment.'
.when(w => w.env('hour', 'gte', 9).env('hour', 'lte', 17))
.when(w => w.env('maintenanceMode', 'eq', false))
```

### Semantic Shortcuts

```typescript
.when(w => w.isOwner())                               // resource.attributes.ownerId eq $subject.id
.when(w => w.isOwner('resource.attributes.createdBy')) // custom owner field
.when(w => w.role('admin'))                            // subject has 'admin' role
.when(w => w.roles('admin', 'superadmin'))             // subject has at least one
.when(w => w.scope('org-acme'))                        // request scope eq 'org-acme'
.when(w => w.scopes('org-acme', 'org-globex'))         // request scope in [...]
.when(w => w.resourceType('post', 'comment'))          // resource.type in [...]
```

### Nesting Conditions (and/or/not)

```typescript
.when(w => w
  .eq('subject.attributes.department', 'engineering')
  .or(w => w                         // any of these
    .role('admin')
    .check('resource.attributes.ownerId', 'eq', '$subject.id')
  )
  .not(w => w                        // none of these
    .eq('subject.attributes.status', 'banned')
    .eq('subject.attributes.status', 'suspended')
  )
  .and(w => w                        // all of these (explicit nesting)
    .attr('tier', 'eq', 'premium')
    .env('region', 'eq', 'us')
  )
)
```

### Standalone When Builder

Build reusable condition groups outside of rules:

```typescript
import { when } from "@gentleduck/iam";

const ownerOrAdmin = when()
  .or((o) => o.isOwner().role("admin"))
  .buildAll();

// Or via access config (typed):
const conditions = access.when().attr("department", "eq", "engineering").buildAll();
```

### Supported Operators

| Operator                   | Description                             |
| -------------------------- | --------------------------------------- |
| `eq`, `neq`                | Equality / inequality                   |
| `gt`, `gte`, `lt`, `lte`   | Numeric comparison                      |
| `in`, `nin`                | Value in / not in array                 |
| `contains`, `not_contains` | String/array contains                   |
| `starts_with`, `ends_with` | String prefix/suffix                    |
| `matches`                  | Regex match (ReDoS-safe, max 512 chars) |
| `exists`, `not_exists`     | Null/undefined check                    |
| `subset_of`, `superset_of` | Array set operations                    |

### Variable References

Condition values starting with `$` are resolved at evaluation time:

```typescript
.check('resource.attributes.ownerId', 'eq', '$subject.id')
// $subject.id resolves to the requesting user's ID
```

---

## Engine

### Creating the Engine

```typescript
import { MemoryAdapter } from "@gentleduck/iam";

const adapter = new MemoryAdapter({
  roles: [viewer, editor, admin],
  assignments: {
    alice: ["admin"],
    bob: ["editor"],
    charlie: ["author"],
  },
  policies: [ownerPolicy],
  attributes: {
    alice: { department: "engineering" },
  },
});

const engine = access.createEngine({ adapter, cacheTTL: 120 });
```

### EngineConfig

| Option          | Type                | Default    | Description                      |
| --------------- | ------------------- | ---------- | -------------------------------- |
| `adapter`       | `Adapter`           | (required) | Storage backend                  |
| `defaultEffect` | `'allow' \| 'deny'` | `'deny'`   | Decision when no rules match     |
| `cacheTTL`      | `number`            | `60`       | Cache TTL in seconds             |
| `maxCacheSize`  | `number`            | `1000`     | Max entries in subject LRU cache |
| `hooks`         | `EngineHooks`       | `{}`       | Lifecycle hooks                  |

### Core Engine Methods

**engine.can()** -- simplest check, returns `true` or `false`:

```typescript
const allowed = await engine.can("user-1", "update", { type: "post", attributes: {} });
```

**engine.check()** -- returns the full `Decision` object:

```typescript
const decision = await engine.check("user-1", "delete", {
  type: "post",
  id: "post-123",
  attributes: { ownerId: "user-2" },
});
if (!decision.allowed) console.log("Denied:", decision.reason);
```

**engine.authorize()** -- low-level, takes a complete `AccessRequest`:

```typescript
const decision = await engine.authorize({
  subject: await engine.resolveSubject("user-1"),
  action: "update",
  resource: { type: "post", id: "post-123", attributes: { ownerId: "user-1" } },
  environment: { ip: "192.168.1.1" },
  scope: "org-1",
});
```

**engine.permissions()** -- batch check multiple permissions at once:

```typescript
const perms = await engine.permissions("user-1", [
  { action: "read", resource: "post" },
  { action: "create", resource: "post" },
  { action: "delete", resource: "post" },
  { action: "manage", resource: "user" },
]);
// { 'read:post': true, 'create:post': true, 'delete:post': false, 'manage:user': false }
```

Permission map keys: `"action:resource"`, `"action:resource:resourceId"`,
`"scope:action:resource"`, or `"scope:action:resource:resourceId"`.

### Hooks

Lifecycle hooks for observing and modifying evaluations:

```typescript
interface EngineHooks {
  beforeEvaluate?(request: AccessRequest): AccessRequest | Promise<AccessRequest>;
  afterEvaluate?(request: AccessRequest, decision: Decision): void | Promise<void>;
  onDeny?(request: AccessRequest, decision: Decision): void | Promise<void>;
  onError?(error: Error, request: AccessRequest): void | Promise<void>;
}
```

- `beforeEvaluate`: modify the request (e.g., inject environment data)
- `afterEvaluate`: log/audit after evaluation
- `onDeny`: alert/monitor denied requests
- `onError`: report errors (engine catches errors and returns deny by default)

### Cache Management

The engine maintains four LRU caches:

| Cache             | Key        | Purpose                                     |
| ----------------- | ---------- | ------------------------------------------- |
| Policy cache      | `'all'`    | Avoid re-fetching ABAC policies             |
| Role cache        | `'all'`    | Avoid re-fetching role definitions          |
| RBAC policy cache | `'rbac'`   | Avoid recomputing role-to-policy conversion |
| Subject cache     | subject ID | Avoid re-resolving the same user            |

Granular invalidation methods:

```typescript
engine.invalidateSubject("user-1"); // after attribute or assignment change for a single user
engine.invalidatePolicies(); // after ABAC policy CRUD
engine.invalidateRoles(); // after role definition CRUD (also clears RBAC policy + subjects)
engine.invalidate(); // nuclear option: clear all caches
```

### Admin API

**Role management:**

```typescript
await engine.admin.listRoles()
await engine.admin.getRole('editor')
await engine.admin.saveRole({ id: 'moderator', name: 'Moderator', permissions: [...], inherits: ['viewer'] })
await engine.admin.deleteRole('moderator')
```

**Role assignments:**

```typescript
await engine.admin.assignRole("user-1", "editor");
await engine.admin.assignRole("user-1", "admin", "org-1"); // scoped
await engine.admin.revokeRole("user-1", "editor");
await engine.admin.revokeRole("user-1", "admin", "org-1");
```

**Policy management:**

```typescript
await engine.admin.listPolicies()
await engine.admin.getPolicy('ip-restriction')
await engine.admin.savePolicy({ id: 'office-hours', name: 'Office Hours Only', algorithm: 'deny-overrides', rules: [...] })
await engine.admin.deletePolicy('office-hours')
```

---

## Explain & Debugging

### engine.explain()

Trace exactly why a request was allowed or denied:

```typescript
const result = await engine.explain("user-1", "update", {
  type: "post",
  id: "post-123",
  attributes: { ownerId: "user-1" },
});

// result.decision: 'allow' | 'deny'
// result.policies: PolicyTrace[]
```

Each `PolicyTrace` includes:

```typescript
interface PolicyTrace {
  policyId: string;
  policyName: string;
  algorithm: CombiningAlgorithm;
  targetMatch: boolean; // false = policy was skipped
  rules: RuleTrace[];
  result: "allow" | "deny";
  reason: string;
  decidingRuleId?: string;
}
```

The explain result also includes subject metadata: `subjectId`, `originalRoles`,
and `scopedRolesApplied` (roles added via scoped enrichment). `explain()` does NOT trigger
`afterEvaluate`/`onDeny`/`onError` hooks (read-only), but DOES apply `beforeEvaluate`.

### validatePolicy()

Runtime validation for untrusted policy objects (from database, API, admin dashboard):

```typescript
const result = validatePolicy(policyFromAPI);
if (!result.valid) {
  console.error("Invalid policy:", result.issues);
}
```

Checks: required fields, valid algorithm, valid effects, valid operators, condition group
structure, duplicate rule IDs, valid targets.

### validateRoles()

Runtime validation for role definitions. Catches circular inheritance, missing parent roles,
duplicate permissions, and more:

```typescript
const result = access.validateRoles([viewer, editor, admin]);
if (!result.valid) throw new Error(result.issues.map((i) => i.message).join(", "));
```

---

## Adapters

The `Adapter` interface is composed of three sub-interfaces: `PolicyStore`, `RoleStore`,
and `SubjectStore`. Four built-in adapters are provided.

### MemoryAdapter

In-memory storage using `Map` objects. Suitable for prototyping, testing, and simple apps.

```typescript
import { MemoryAdapter } from "@gentleduck/iam";

const adapter = new MemoryAdapter({
  policies: [ownerPolicy],
  roles: [viewer, editor, admin],
  assignments: {
    alice: ["viewer"],
    bob: ["editor"],
  },
  attributes: {
    alice: { department: "engineering" },
  },
});
```

- `getSubjectRoles()` returns only entries where `scope == null` (base roles)
- `getSubjectScopedRoles()` returns only entries where `scope != null`
- `assignRole()` prevents duplicates before inserting
- `setSubjectAttributes()` merges into existing attributes (does not replace)

### DrizzleAdapter

Drizzle ORM adapter. Requires four tables: policies, roles, assignments, and subject attributes.
JSON columns (rules, permissions, targets, metadata) are serialized/deserialized automatically.

```typescript
import { DrizzleAdapter } from "@gentleduck/iam/adapters/drizzle";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { policies, roles, assignments, attrs } from "./schema";

const adapter = new DrizzleAdapter({
  db,
  tables: { policies, roles, assignments, attrs },
  ops: { eq, and },
});
```

### PrismaAdapter

Prisma adapter. Expects four Prisma models: `accessPolicy`, `accessRole`,
`accessAssignment`, and `accessSubjectAttr`.

```typescript
import { PrismaAdapter } from "@gentleduck/iam/adapters/prisma";
import { prisma } from "./db";

const adapter = new PrismaAdapter(prisma);
```

### HttpAdapter

HTTP adapter for client-side engines that delegate storage to a remote API.

```typescript
import { HttpAdapter } from "@gentleduck/iam/adapters/http";

const adapter = new HttpAdapter({
  baseUrl: "https://api.example.com/access",
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
  fetch: customFetch, // optional, defaults to globalThis.fetch
});
```

REST endpoints: `GET /policies`, `PUT /policies`, `DELETE /policies/:id`,
`GET /roles`, `PUT /roles`, `DELETE /roles/:id`,
`GET /subjects/:id/roles`, `POST /subjects/:id/roles`,
`DELETE /subjects/:id/roles/:roleId`, `GET /subjects/:id/attributes`,
`PATCH /subjects/:id/attributes`, `GET /subjects/:id/scoped-roles`.

---

## Client Integrations

### Vanilla (Framework-Agnostic)

Works with any framework or no framework. Wraps a `PermissionMap` with `.can()` / `.cannot()`.

```typescript
import { AccessClient } from "@gentleduck/iam/client/vanilla";

// From pre-fetched permissions
const access = new AccessClient(permissionsFromServer);
access.can("delete", "post"); // boolean
access.cannot("manage", "billing"); // boolean
access.allowedActions("post"); // ['read', 'create', ...]
access.hasAnyOn("post"); // boolean

// Reactive updates
const unsubscribe = access.subscribe((perms) => rerender());
access.update(newPermissions); // replace all
access.merge(extraPermissions); // merge into existing

// Fetch from server
const access = await AccessClient.fromServer("/api/permissions", {
  headers: { Authorization: "Bearer ..." },
});
```

### React

Factory-based to avoid hard React dependency:

```typescript
// lib/access.tsx
import React from "react";
import { createAccessControl } from "@gentleduck/iam/client/react";

export const { AccessProvider, useAccess, usePermissions, Can, Cannot } =
  createAccessControl(React);
```

**Provider pattern (server-driven, recommended):**

```tsx
// Server: generate permission map
const perms = await engine.permissions(userId, checks)

// Client: wrap app
<AccessProvider permissions={perms}>
  <App />
</AccessProvider>

// In components:
const { can, cannot } = useAccess()
if (can('delete', 'post')) { /* ... */ }
```

**Declarative components:**

```tsx
<Can action="manage" resource="team">
  <AdminPanel />
</Can>

<Can action="read" resource="analytics" fallback={<UpgradePrompt />}>
  <AnalyticsDashboard />
</Can>

<Cannot action="delete" resource="post">
  <span>Read-only</span>
</Cannot>
```

**Fetch hook:**

```tsx
const { permissions, can, loading, error } = usePermissions(
  () => fetch("/api/permissions").then((r) => r.json()),
  [userId],
);
```

**Standalone checker (no context):**

```typescript
import { createPermissionChecker } from "@gentleduck/iam/client/react";
const { can, cannot } = createPermissionChecker(permissionMap);
```

### Vue 3

Factory-based to avoid hard Vue dependency:

```typescript
import { ref, computed, inject, provide, defineComponent, h } from "vue";
import { createVueAccess } from "@gentleduck/iam/client/vue";

export const { useAccess, provideAccess, createAccessPlugin, Can, Cannot } = createVueAccess({
  ref,
  computed,
  inject,
  provide,
  defineComponent,
  h,
});
```

**Plugin (global):**

```typescript
// main.ts
app.use(createAccessPlugin(permissionMap));

// In any component — via composable or global properties:
const { can, cannot, update } = useAccess();
// Or in templates: $can('delete', 'post'), $cannot('manage', 'user')
```

**Declarative components:**

```vue
<Can action="delete" resource="post">
  <button>Delete</button>
</Can>

<Can action="read" resource="analytics">
  <template #default>Analytics</template>
  <template #fallback>Upgrade to Pro</template>
</Can>

<Cannot action="read" resource="analytics">
  <div>Upgrade to access this feature</div>
</Cannot>
```

---

## Server Integrations

### Generic Helpers

Framework-agnostic server-side utilities:

```typescript
import {
  generatePermissionMap,
  createSubjectCan,
  extractEnvironment,
  METHOD_ACTION_MAP,
} from "@gentleduck/iam/server/generic";

// Generate permission map for client hydration
const perms = await generatePermissionMap(engine, userId, checks, environment);

// Terse per-request checker
const can = createSubjectCan(engine, req.user.id, environment);
if (await can("delete", "post", "post-123")) {
  /* ... */
}

// Extract environment from request
const env = extractEnvironment(req); // { ip, userAgent, timestamp }

// HTTP method to action mapping
METHOD_ACTION_MAP["DELETE"]; // 'delete'
METHOD_ACTION_MAP["POST"]; // 'create'
```

### Express

```typescript
import { accessMiddleware, guard, adminRouter } from "@gentleduck/iam/server/express";

// Global middleware — checks every request
app.use(
  accessMiddleware(engine, {
    getUserId: (req) => req.user?.id,
    getScope: (req) => req.headers["x-org-id"],
    onDenied: (req, res) => res.status(403).json({ error: "Forbidden" }),
  }),
);

// Per-route guard
app.delete("/posts/:id", guard(engine, "delete", "post"), handler);
app.post("/admin/users", guard(engine, "manage", "user", { scope: "admin" }), handler);

// Admin API router (mount at /api/access-admin)
import { Router } from "express";
app.use(
  "/api/access-admin",
  adminRouter(engine)(() => Router()),
);
```

### Hono

```typescript
import { accessMiddleware, guard } from "@gentleduck/iam/server/hono";

// Global middleware
app.use(
  "*",
  accessMiddleware(engine, {
    getUserId: (c) => c.get("userId") ?? c.req.header("x-user-id"),
  }),
);

// Per-route guard
app.delete("/posts/:id", guard(engine, "delete", "post"), handler);
app.post("/admin/users", guard(engine, "manage", "user", { scope: "admin" }), handler);
```

### NestJS

```typescript
import { Authorize, nestAccessGuard, createTypedAuthorize, createEngineProvider, ACCESS_ENGINE_TOKEN } from '@gentleduck/iam/server/nest'

// Module provider
@Module({
  providers: [createEngineProvider(() => buildEngine())],
})
export class AccessModule {}

// Guard setup (in bootstrap or module)
const guard = nestAccessGuard(engine, {
  getUserId: (req) => req.user?.id ?? req.user?.sub,
})

// Controller with decorator
@Authorize({ action: 'delete', resource: 'post' })
async deletePost(@Param('id') id: string) { /* ... */ }

// Infer action from HTTP method + resource from route path
@Authorize({ infer: true })
async handleRoute() { /* ... */ }

// Typed decorator (compile errors on typos)
const TypedAuthorize = createTypedAuthorize<AppAction, AppResource, AppScope>()
@TypedAuthorize({ action: 'manage', resource: 'user' }) // type-checked
```

### Next.js (App Router)

```typescript
import {
  withAccess,
  checkAccess,
  getPermissions,
  createNextMiddleware,
} from "@gentleduck/iam/server/next";

// API Route Handler wrapper
export const DELETE = withAccess(
  engine,
  "delete",
  "post",
  async (req, ctx) => {
    // handler only runs if authorized
    return Response.json({ ok: true });
  },
  { getUserId: (req) => req.headers.get("x-user-id") },
);

// Server Component helper
const allowed = await checkAccess(engine, userId, "read", "analytics");

// Permission map for client hydration (in layout or RSC)
const perms = await getPermissions(engine, userId, checks);

// Next.js Middleware (edge route protection)
const matcher = createNextMiddleware(engine, {
  getUserId: (req) => req.headers.get("x-user-id"),
  rules: [
    { pattern: "/admin", resource: "admin", action: "manage" },
    { pattern: /^\/posts\//, resource: "post" }, // action inferred from HTTP method
  ],
});

// In middleware.ts
export async function middleware(req: NextRequest) {
  const result = await matcher(req);
  if (result) return result; // denied or unauthorized
  return NextResponse.next();
}
```

---

## Full Example: Multi-Tenant Blog Application

```typescript
import { createAccessConfig, MemoryAdapter } from "@gentleduck/iam";

// 1. Define the permission schema
const access = createAccessConfig({
  actions: ["create", "read", "update", "delete", "publish", "manage"] as const,
  resources: ["post", "comment", "user", "analytics", "settings"] as const,
  scopes: ["org-acme", "org-globex"] as const,
  roles: ["viewer", "author", "editor", "admin"] as const,
});

// 2. Define roles
const viewer = access.defineRole("viewer").grant("read", "post").grant("read", "comment").build();

const author = access
  .defineRole("author")
  .inherits("viewer")
  .grant("create", "post")
  .grant("update", "post")
  .grant("create", "comment")
  .build();

const editor = access
  .defineRole("editor")
  .inherits("author")
  .grant("publish", "post")
  .grant("update", "comment")
  .grant("delete", "comment")
  .build();

const admin = access
  .defineRole("admin")
  .inherits("editor")
  .grant("delete", "post")
  .grant("manage", "user")
  .grant("manage", "analytics")
  .grant("manage", "settings")
  .build();

// 3. Validate roles at startup
const roleCheck = access.validateRoles([viewer, author, editor, admin]);
if (!roleCheck.valid)
  throw new Error("Invalid roles: " + roleCheck.issues.map((i) => i.message).join(", "));

// 4. Define policies
const ownerPolicy = access
  .policy("owner-restrictions")
  .name("Owner Restrictions")
  .algorithm("deny-overrides")
  .rule("authors-own-posts-only", (r) =>
    r
      .deny()
      .on("update", "delete")
      .of("post")
      .priority(100)
      .when((w) =>
        w.check("resource.attributes.ownerId", "neq", "$subject.id").not((w) => w.role("admin")),
      ),
  )
  .build();

// 5. Create the engine
const adapter = new MemoryAdapter({
  roles: [viewer, author, editor, admin],
  assignments: { alice: ["admin"], bob: ["editor"], charlie: ["author"] },
  policies: [ownerPolicy],
});
const engine = access.createEngine({ adapter, cacheTTL: 120 });

// 6. Typed batch permission checks for UI
const dashboardChecks = access.checks([
  { action: "read", resource: "analytics" },
  { action: "manage", resource: "analytics" },
  { action: "manage", resource: "settings" },
]);

async function getDashboardPermissions(userId: string) {
  return engine.permissions(userId, dashboardChecks);
}
```

---

## Common Patterns

### Owner-Only Access

```typescript
.rule('owner-only', r => r
  .deny().on('update', 'delete').of('post')
  .when(w => w
    .check('resource.attributes.ownerId', 'neq', '$subject.id')
    .not(w => w.role('admin'))  // admins bypass
  )
)
```

### Time-Based Policies

```typescript
const officeHours = policy("office-hours")
  .algorithm("deny-overrides")
  .rule("deny-outside-hours", (r) =>
    r
      .deny()
      .on("*")
      .of("*")
      .priority(100)
      .when((w) => w.or((w) => w.lt("environment.hour", 9).gt("environment.hour", 17))),
  )
  .rule("allow-all", (r) => r.allow().on("*").of("*").priority(1))
  .build();
```

### Defense-in-Depth Layering

Stack independent policies -- each evaluates independently, a deny from any is final:

- Layer 1: RBAC Policy (WHO can do what)
- Layer 2: Time Policy (WHEN they can do it)
- Layer 3: Geo Policy (WHERE from)
- Layer 4: Content Policy (WHAT they can do it to)

### UI Permission Hydration

Use `engine.permissions()` to batch-check and hydrate UI state:

```typescript
const uiChecks = access.checks([
  { action: "create", resource: "post" },
  { action: "update", resource: "post", resourceId: "post-1" },
  { action: "delete", resource: "post", resourceId: "post-1" },
  { action: "manage", resource: "dashboard" },
]);
const perms = await engine.permissions("user-1", uiChecks);
// Use perms['create:post'] to show/hide buttons
```

### Import Paths

| Import                             | Contents                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `@gentleduck/iam`                  | Core: `createAccessConfig`, `MemoryAdapter`, `LRUCache`, `buildPermissionKey`, all types              |
| `@gentleduck/iam/adapters/drizzle` | `DrizzleAdapter`                                                                                      |
| `@gentleduck/iam/adapters/prisma`  | `PrismaAdapter`                                                                                       |
| `@gentleduck/iam/adapters/http`    | `HttpAdapter`                                                                                         |
| `@gentleduck/iam/client/vanilla`   | `AccessClient`                                                                                        |
| `@gentleduck/iam/client/react`     | `createAccessControl`, `createPermissionChecker`                                                      |
| `@gentleduck/iam/client/vue`       | `createVueAccess`                                                                                     |
| `@gentleduck/iam/server/generic`   | `generatePermissionMap`, `createSubjectCan`, `extractEnvironment`, `METHOD_ACTION_MAP`                |
| `@gentleduck/iam/server/express`   | `accessMiddleware`, `guard`, `adminRouter`                                                            |
| `@gentleduck/iam/server/hono`      | `accessMiddleware`, `guard`                                                                           |
| `@gentleduck/iam/server/nest`      | `Authorize`, `nestAccessGuard`, `createTypedAuthorize`, `createEngineProvider`, `ACCESS_ENGINE_TOKEN` |
| `@gentleduck/iam/server/next`      | `withAccess`, `checkAccess`, `getPermissions`, `createNextMiddleware`                                 |
