---
td-board: open-portal-phase-1
td-issue: td-a7bcb4
---

# Proposal: OpenPort Phase 1 — Core Foundation

## Why

The Staccato Toolkit currently relies on three separate portals (Backstage, Headlamp, Perses) with
three separate authentication stacks and deployment configurations. OpenPort consolidates these into
a single, OTel-native developer portal built on SolidJS and TanStack Start. Phase 1 establishes
the core foundation: authenticated access, a working system catalog, and a read-only Kubernetes
browser — all with mocked external integrations to enable rapid iteration without infrastructure
dependencies.

## What Changes

- New application at `src/open-portal/` within the monorepo
- TanStack Start (SolidJS) full-stack scaffold with Bun, Drizzle ORM (SQLite), and Nano Stores
- Better Auth session management with OIDC providers (GitHub/Google) — **mocked in this phase**
- RBAC system: organizations, teams, roles, and permission enforcement
- System catalog with all 8 Backstage entity kinds and `catalog-info.yaml` import support
- Kubernetes plugin with label-based entity correlation — **K8s API mocked in this phase**
- Turn-key self-introspection: OTel SDK wiring + bundled dashboards for OpenPort itself

## Capabilities

### New Capabilities

- `project-scaffold`: TanStack Start + SolidJS monorepo application with Bun, Vite, Nano Stores,
  and Drizzle ORM (SQLite default). Establishes the repo layout under `src/open-portal/` matching
  the structure defined in OPEN_PORTAL.md.
- `auth-rbac`: Better Auth integration with OIDC provider support (GitHub, Google). RBAC model
  including organizations, teams, members, and roles. Permission enforcement at the server-function
  layer. OIDC providers mocked via in-memory stub for local development.
- `system-catalog`: Full entity catalog supporting all 8 Backstage kinds (Component, API, Resource,
  System, Domain, User, Group, Location). CRUD operations, `catalog-info.yaml` import, and
  Drizzle-backed persistence.
- `kubernetes-plugin`: Label-based K8s entity correlation using `staccato.io/*` labels. Read-only
  resource browser (Deployments, Services, Pods, ReplicaSets). Pod log streaming. K8s API mocked
  via a local fixture server in this phase.
- `self-introspection`: OTel SDK instrumentation of OpenPort itself (HTTP metrics, traces, logs).
  Pre-built self-monitoring dashboard package activated by default.

### Modified Capabilities

_(none — this is a greenfield application)_

## Impact

- Affected services/modules: New `src/open-portal/` subtree; `go.work` and `package.json` updated
  to include new workspace member
- API changes: No changes to existing APIs; new TanStack Start server functions introduced
- Data model changes: New SQLite schema (Drizzle ORM); no changes to existing databases
- Dependencies: TanStack Start, SolidJS, Better Auth, Drizzle ORM, Nano Stores (new); Bun
  (already in use); OTel SDK (new for TypeScript layer)
