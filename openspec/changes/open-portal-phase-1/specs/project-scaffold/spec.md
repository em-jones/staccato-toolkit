---
td-board: open-portal-phase-1-project-scaffold
td-issue: td-e4a7cc
---

# Specification: Project Scaffold

## Overview

Defines the monorepo layout, toolchain, and foundational dependencies for the OpenPort web
application at `src/open-portal/`. This capability establishes the project skeleton that all other
capabilities build upon.

## ADDED Requirements

### Requirement: Monorepo layout

The scaffold SHALL produce the directory structure defined in OPEN_PORTAL.md under
`src/open-portal/`, including `apps/web`, `apps/tui`, `apps/web-design-system`,
`apps/tui-design-system`, and `packages/` sub-packages (app, catalog, db, k8s, plugins).

#### Scenario: Directory structure matches spec

- **WHEN** the scaffold is applied
- **THEN** `src/open-portal/apps/web/`, `src/open-portal/apps/web-design-system/`,
  `src/open-portal/packages/app/`, `src/open-portal/packages/catalog/`,
  `src/open-portal/packages/db/`, `src/open-portal/packages/k8s/`, and
  `src/open-portal/packages/plugins/` all exist

### Requirement: TanStack Start application

The web application SHALL be bootstrapped with TanStack Start as the full-stack framework, using
SolidJS as the UI framework, served by Vite with the official TanStack Start Vite plugin.

#### Scenario: Dev server starts

- **WHEN** `bun run dev` is executed inside `src/open-portal/apps/web/`
- **THEN** the TanStack Start dev server starts on a configured port with no errors

#### Scenario: Build succeeds

- **WHEN** `bun run build` is executed inside `src/open-portal/apps/web/`
- **THEN** the application builds to a production bundle without errors

### Requirement: Bun as package manager

All JavaScript/TypeScript packages under `src/open-portal/` SHALL use Bun as the package manager.
`package.json` files SHALL declare `packageManager: bun`. No `npm` or `pnpm` lock files shall
exist in this subtree.

#### Scenario: Install succeeds with Bun

- **WHEN** `bun install` is run at the `src/open-portal/` workspace root
- **THEN** all workspace dependencies are installed without errors

### Requirement: Drizzle ORM with SQLite for local development

The `packages/db` package SHALL configure Drizzle ORM with a SQLite driver (`bun:sqlite`) for
local development. The package SHALL export a `db` instance and schema definitions. Migration
files SHALL be tracked in `packages/db/migrations/`.

#### Scenario: Database initialises on first run

- **WHEN** the application starts with no existing database file
- **THEN** Drizzle ORM creates the SQLite database and runs all pending migrations

#### Scenario: Migration file generated from schema change

- **WHEN** the Drizzle schema is modified and `bun run db:generate` is executed
- **THEN** a new migration SQL file is produced in `packages/db/migrations/`

### Requirement: Nano Stores for state management

The `packages/app` package SHALL install and re-export Nano Stores (`nanostores` and
`@nanostores/solid`) as the shared state management layer. No React-based state libraries shall
be introduced.

#### Scenario: Atom store reactive in SolidJS component

- **WHEN** a SolidJS component subscribes to a Nano Store atom via `useStore`
- **THEN** the component re-renders when the atom value changes

### Requirement: Workspace integrated into monorepo

`src/open-portal/` SHALL be registered as a workspace member in the root `package.json` and `go.work`
shall be updated only if Go packages are introduced. The `devbox.json` SHALL be updated to include
any new CLI tools required (e.g., `drizzle-kit`).

#### Scenario: Workspace recognised at root

- **WHEN** `bun install` is run at the monorepo root
- **THEN** packages under `src/open-portal/` are resolved as workspace members
