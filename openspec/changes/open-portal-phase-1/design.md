---
td-board: open-portal-phase-1
td-issue: td-a7bcb4
---

# Design: OpenPort Phase 1 — Core Foundation

## Overview

This design covers the implementation approach for OpenPort Phase 1: the project scaffold,
auth/RBAC, system catalog, Kubernetes plugin (mocked), and self-introspection. All external
integrations (OIDC, Kubernetes API) are mocked in this phase to enable rapid iteration without
infrastructure dependencies.

---

## Architecture Decisions

### Full-stack framework: TanStack Start + SolidJS

TanStack Start is chosen as the full-stack framework per OPEN_PORTAL.md. Server functions replace
REST boilerplate and provide end-to-end TypeScript type safety. SolidJS provides fine-grained
reactivity without virtual DOM overhead. The combination is explicitly accepted at RC status per
OPEN_PORTAL.md.

### Database: Drizzle ORM + SQLite (dev) / PostgreSQL (prod)

Drizzle ORM is the TypeScript-first ORM. SQLite (`bun:sqlite`) is used for local development
(zero external dependencies). The same schema targets PostgreSQL in production via Drizzle's
dialect abstraction. Migration files are committed and run via `drizzle-kit`.

### Auth: Better Auth + in-memory mock adapter

Better Auth handles session management, OAuth2/OIDC flows, and multi-tenancy (organizations,
teams). An in-memory mock adapter (activated via `OPENPORT_AUTH_MOCK=true`) bypasses real OIDC
in local development. The mock returns a synthetic user identity and skips external network calls.

### State management: Nano Stores

Nano Stores (`nanostores` + `@nanostores/solid`) are used for client-side shared state. No
React-based state libraries are introduced. Nano Stores are framework-agnostic and SSR-safe.

### Kubernetes client: interface + mock fixture server

A `KubernetesClient` TypeScript interface abstracts all K8s API calls. A `MockKubernetesClient`
implementation reads from static JSON fixture files under `packages/k8s/fixtures/`. Activated via
`OPENPORT_K8S_MOCK=true`. The mock supports: list resources, get resource, stream pod logs (SSE
replay).

### Observability: @opentelemetry/sdk-node

The OTel Node.js SDK is used for self-instrumentation. Exporters: OTLP HTTP for traces/metrics
(`@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`). Logs
via `@opentelemetry/sdk-logs`. SDK initialised at startup before the TanStack Start server.

### Build tool: Vite (via TanStack Start plugin)

Vite is the underlying build tool, wired through TanStack Start's official Vite plugin. No
additional Vite configuration beyond what TanStack Start requires.

---

## Repository Layout

```
src/open-portal/
├── apps/
│   ├── web/                         # TanStack Start + SolidJS application
│   │   ├── src/
│   │   │   ├── routes/              # File-based routing (TanStack Start)
│   │   │   │   ├── index.tsx        # Dashboard / home
│   │   │   │   ├── auth/
│   │   │   │   │   └── sign-in.tsx
│   │   │   │   ├── catalog/
│   │   │   │   │   ├── index.tsx    # Entity list
│   │   │   │   │   └── $kind.$name.tsx  # Entity detail
│   │   │   │   └── kubernetes/
│   │   │   │       ├── index.tsx    # Resource browser
│   │   │   │       └── $kind.tsx    # Resource kind list
│   │   │   ├── components/          # SolidJS UI components
│   │   │   └── server/              # Server functions
│   │   │       ├── auth.ts
│   │   │       ├── catalog.ts
│   │   │       └── kubernetes.ts
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── web-design-system/           # Shared SolidJS component library (Phase 1: stub)
│   ├── tui/                         # TUI application (Phase 4: stub only in Phase 1)
│   └── tui-design-system/           # TUI component library (Phase 4: stub only in Phase 1)
├── packages/
│   ├── app/                         # Core logic: permission enum, shared types
│   │   └── src/
│   │       ├── permissions.ts       # Permission enum + requirePermission helper
│   │       └── stores/              # Nano Stores atoms
│   ├── catalog/                     # Entity catalog logic
│   │   └── src/
│   │       ├── kinds.ts             # EntityKind enum + schema validation (zod)
│   │       ├── import.ts            # importFromYaml function
│   │       ├── relations.ts         # Relation extraction from spec
│   │       └── search.ts            # Full-text search helper
│   ├── db/                          # Drizzle ORM schema + migrations
│   │   ├── src/
│   │   │   ├── schema.ts            # Table definitions
│   │   │   └── index.ts             # db instance export
│   │   ├── migrations/
│   │   └── drizzle.config.ts
│   ├── k8s/                         # Kubernetes client abstraction
│   │   ├── src/
│   │   │   ├── client.ts            # KubernetesClient interface
│   │   │   └── mock.ts              # MockKubernetesClient implementation
│   │   └── fixtures/
│   │       ├── deployments.json
│   │       ├── services.json
│   │       ├── pods.json
│   │       └── logs.txt
│   ├── plugins/
│   │   └── signals/
│   │       └── self-introspection/
│   │           └── dashboard.json   # Self-monitoring dashboard definition
│   └── tui/                         # TUI shared types (stub for Phase 1)
└── catalog-info.yaml                # OpenPort's own catalog entity
```

---

## Technology Adoption & Usage Rules

| Domain | Technology | Status | Usage Rule | Notes |
|---|---|---|---|---|
| SolidJS | SolidJS | adopt | n/a (to be created) | Fine-grained reactivity; replaces React in all OpenPort UIs |
| TanStack Start | TanStack Start | adopt | n/a (to be created) | Full-stack framework; server functions replace REST boilerplate |
| Bun | Bun | adopt | n/a (already in use across repo) | Package manager + runtime for all TypeScript in `src/open-portal/` |
| Drizzle ORM | Drizzle ORM | adopt | n/a (to be created) | TypeScript-first ORM; SQLite in dev, PostgreSQL in prod |
| Better Auth | Better Auth | adopt | n/a (to be created) | Session management + OIDC integration |
| Nano Stores | Nano Stores | adopt | n/a (to be created) | Framework-agnostic state management for SolidJS |
| OTel TypeScript | @opentelemetry/sdk-node | Adopt | existing | Already in tech radar at Adopt |

---

## Implementation Sequence

Phase 1 tasks should be implemented in this order (matches dependency graph):

1. **project-scaffold** — monorepo layout, TanStack Start scaffold, Drizzle setup (all other
   capabilities depend on this)
2. **auth-rbac** — session management, RBAC model, permission enforcement (system-catalog and
   k8s depend on permissions)
3. **system-catalog** — entity CRUD, YAML import, search (k8s plugin depends on entity
   correlation; self-introspection depends on catalog CRUD)
4. **kubernetes-plugin** — K8s client abstraction, resource browser, SSE log streaming
5. **self-introspection** — OTel SDK wiring, structured logging, self-catalog entity

---

## Mock Adapters

Two external integrations are mocked in Phase 1:

| Integration | Mock Mechanism | Activation |
|---|---|---|
| OIDC providers (GitHub, Google) | In-memory stub in Better Auth config; returns synthetic identity | `OPENPORT_AUTH_MOCK=true` |
| Kubernetes API | `MockKubernetesClient` reading `packages/k8s/fixtures/*.json` | `OPENPORT_K8S_MOCK=true` |

Both environment variables default to `true` in the local development `.env` file (`.env.local`)
and to `false` in production `.env.production`. Mocks are co-located with their real
implementations and selected at runtime via the env flag — not via compile-time conditionals.

---

## Cross-Cutting Concerns

### Error handling

All server functions follow the pattern: return `{data, error}` objects rather than throwing.
The `error` field is a typed discriminated union. Client code pattern-matches on the error kind.

### TypeScript strict mode

All packages under `src/open-portal/` shall enable `strict: true` in `tsconfig.json`. No `any`
types except at explicit external API boundaries (K8s API response types, OIDC callback payloads).

### Environment configuration

A `.env.schema` file (already present at the repo root) shall be extended to document all
`OPENPORT_*` environment variables. Each new env var requires a schema entry.

---

## Agent Skills

| Skill | Action | Notes |
|---|---|---|
| `go-developer` | n/a | Not applicable — this change is TypeScript only |
| `bubbletea` | n/a | TUI is a Phase 4 concern; stub directories only in Phase 1 |
