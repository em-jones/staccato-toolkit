# OpenPort Phase 1

**IMPORTANT**: This is also the temporary home for the [Open Quality Assurance Toolkit](./oqa),
which is a separate project. It lives here to make sure that it conforms to the same standards and
practices as the Open Portal platform. The OQA Toolkit will eventually be split out into its own
repository once it has a stable foundation.

Open Portal is a unified developer platform built with TanStack Start, SolidJS, and Drizzle ORM.

## Overview

This directory contains the OpenPort monorepo, structured as follows:

- **`apps/web/`** - TanStack Start + SolidJS web application
- **`apps/tui/`** - Terminal UI application (Phase 4 stub)
- **`packages/app/`** - Core types, permissions, and stores
- **`packages/db/`** - Drizzle ORM schema and database initialization
- **`packages/catalog/`** - Entity catalog logic (kinds, import, search)
- **`packages/k8s/`** - Kubernetes client abstraction and mock implementation
- **`packages/plugins/`** - Plugin system (signals, gitops)

## Technologies

- **Framework**: TanStack Start + SolidJS
- **Package Manager**: Bun
- **Database**: SQLite (dev) / PostgreSQL (prod) with Drizzle ORM
- **Auth**: Better Auth + OIDC (mocked in Phase 1)
- **State Management**: Nano Stores
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Bun 1.0+
- Devbox (for environment setup)

### Setup

1. **Enter devbox environment:**

   ```bash
   cd /home/em/repos/oss/staccato-toolkit
   devbox shell
   ```

2. **Install dependencies:**

   ```bash
   cd src/open-portal
   bun install
   ```

3. **Generate database migrations:**

   ```bash
   bun run db:generate
   ```

### Development

1. **Start the dev server:**

   ```bash
   bun run dev
   ```

2. **Access the application:**

   ```
   http://localhost:3000
   ```

### Environment Variables

Key environment variables for Phase 1:

- `OPENPORT_AUTH_MOCK=true` - Use mock OIDC providers (default for development)
- `OPENPORT_K8S_MOCK=true` - Use mock Kubernetes client (default for development)
- `DATABASE_URL=file:./dev.db` - SQLite database file

See `.env.schema` at the repo root for full configuration.

## Architecture

### Auth & RBAC

- Sessions stored in SQLite via Better Auth Drizzle adapter
- Mock OIDC adapter enabled by `OPENPORT_AUTH_MOCK=true`
- Permission enum defines all platform permissions
- Roles (admin, editor, viewer, operator, workflow.admin, dashboard.edit) map to permissions
- RBAC model: organizations → teams → members → role_assignments

### Database Schema

Key tables:

- `users` - User accounts
- `sessions` - Better Auth sessions
- `organizations` - Top-level organizational units
- `teams` - Teams within organizations
- `team_members` - Team membership
- `roles` - Role definitions
- `role_assignments` - Role assignments to members
- `catalog_entities` - Catalog entities
- `entity_relations` - Relations between entities

### Kubernetes Integration

- `KubernetesClient` interface abstracts all K8s API calls
- `MockKubernetesClient` reads from static JSON fixtures (`packages/k8s/fixtures/`)
- Activated via `OPENPORT_K8S_MOCK=true` environment variable
- Real K8s client implementation planned for Phase 2

### Catalog System

- `EntityKind` enum defines supported entity types
- Zod schemas for validation
- YAML import function (`importFromYaml`)
- Relation extraction from entity specs
- Full-text search helper

## Development Workflow

### Server Functions

All mutation/query endpoints are TanStack Start server functions in `apps/web/src/server/`:

- `auth.ts` - Authentication (sign-in, sign-up, sign-out)
- `catalog.ts` - Catalog entity operations
- `kubernetes.ts` - K8s resource queries and logs
- `rbac.ts` - RBAC operations (teams, roles, assignments)

Server functions automatically include permission checking via `requirePermission()`.

### File Structure

```
apps/web/
├── src/
│   ├── routes/                  # File-based routing
│   │   ├── index.tsx            # Home/dashboard
│   │   ├── auth.tsx             # Auth layout
│   │   ├── auth/sign-in.tsx      # Sign-in page
│   │   ├── catalog.tsx          # Catalog layout
│   │   ├── catalog/index.tsx     # Entity list
│   │   ├── kubernetes.tsx       # K8s layout
│   │   └── kubernetes/index.tsx  # Resource browser
│   ├── server/                  # Server functions
│   │   ├── auth-config.ts       # Better Auth configuration
│   │   ├── auth.ts              # Auth server functions
│   │   ├── catalog.ts           # Catalog server functions
│   │   ├── kubernetes.ts        # K8s server functions
│   │   ├── rbac.ts              # RBAC server functions
│   │   └── session-middleware.ts # Permission context extraction
│   ├── components/              # SolidJS components
│   ├── root.tsx                 # Root layout
│   ├── entry-client.ts          # Client entry
│   └── entry-server.ts          # Server entry
├── vite.config.ts               # Vite configuration
└── tsconfig.json                # TypeScript config

packages/
├── app/                         # Core types & permissions
│   ├── src/
│   │   ├── permissions.ts       # Permission enum & helpers
│   │   ├── roles.ts             # Role definitions & mappings
│   │   └── stores/              # Nano Stores
├── db/                          # Database
│   ├── src/
│   │   ├── schema.ts            # Drizzle schema
│   │   └── index.ts             # Database export
│   ├── migrations/              # SQL migrations
│   └── drizzle.config.ts
├── catalog/                     # Entity catalog
│   ├── src/
│   │   ├── kinds.ts             # Entity kinds & schemas
│   │   ├── import.ts            # YAML import
│   │   ├── relations.ts         # Relation extraction
│   │   └── search.ts            # Search helpers
└── k8s/                         # Kubernetes
    ├── src/
    │   ├── client.ts            # Interface
    │   └── mock.ts              # Mock implementation
    └── fixtures/                # JSON fixtures
```

## Testing

### Mock Auth

To test with mock authentication:

```bash
export OPENPORT_AUTH_MOCK=true
bun run dev
```

Then sign in with any email/password combination.

### Mock Kubernetes

To test with mock Kubernetes resources:

```bash
export OPENPORT_K8S_MOCK=true
bun run dev
```

Navigate to `/kubernetes` to see mock resources (deployments, services, pods).

## TypeScript Strict Mode

All packages use `strict: true` in `tsconfig.json`. No `any` types except at explicit API boundaries
(K8s response types, OIDC payloads).

## Building for Production

```bash
bun run build
```

This produces a production bundle optimized for deployment.

## Roadmap

- **Phase 1** (current): Core foundation with mock integrations
- **Phase 2**: Real Kubernetes API client, PostgreSQL support
- **Phase 3**: Plugin system completion, custom dashboards
- **Phase 4**: Terminal UI application, advanced workflows

## Contributing

See CONTRIBUTING.md at repo root for contribution guidelines.

## License

Apache 2.0
