---
td-board: open-portal-phase-1-auth-rbac
td-issue: td-4ee158
---

# Specification: Auth & RBAC

## Overview

Defines authentication and role-based access control for OpenPort using Better Auth. OIDC
providers (GitHub, Google) are wired in Phase 1 but backed by an in-memory mock adapter for
local development. The RBAC model (organizations → teams → members → roles) is enforced at the
server-function layer from day one.

## ADDED Requirements

### Requirement: Better Auth session management

The application SHALL use Better Auth as the session management library. Sessions SHALL be stored
in the Drizzle-managed SQLite database using the Better Auth Drizzle adapter. Session cookies SHALL
be HttpOnly and SameSite=Strict.

#### Scenario: User session persists across page reloads

- **WHEN** a user signs in successfully
- **THEN** subsequent requests include a valid session cookie and the user is not redirected to the
  sign-in page

#### Scenario: Expired session redirects to sign-in

- **WHEN** a session cookie is expired or invalid
- **THEN** the user is redirected to the `/auth/sign-in` route

### Requirement: OIDC provider integration (mocked)

The application SHALL declare OIDC provider configurations for GitHub and Google via Better Auth's
OAuth2 plugin. In local development, these providers SHALL be replaced by an in-memory mock
adapter that accepts any credentials and returns a synthetic identity, enabling development without
real OIDC credentials. The mock adapter SHALL be activated by the `OPENPORT_AUTH_MOCK=true`
environment variable.

#### Scenario: Sign-in succeeds with mock adapter enabled

- **WHEN** `OPENPORT_AUTH_MOCK=true` is set and a user submits the sign-in form
- **THEN** the user is authenticated with a synthetic identity and redirected to the dashboard

#### Scenario: Real OIDC flow initiated when mock disabled

- **WHEN** `OPENPORT_AUTH_MOCK=false` (or unset) and a user clicks "Sign in with GitHub"
- **THEN** the browser is redirected to GitHub's OAuth2 authorization endpoint

### Requirement: RBAC data model

The database SHALL store the RBAC hierarchy: `organizations` → `teams` → `members` → `role_assignments`.
Roles SHALL be one of: `admin`, `editor`, `viewer`, `operator`, `workflow.admin`, `dashboard.edit`.
Drizzle schema SHALL enforce referential integrity with foreign keys.

#### Scenario: Member assigned a role

- **WHEN** an admin assigns the `editor` role to a user within a team
- **THEN** the `role_assignments` table contains the mapping and the user gains editor permissions

#### Scenario: Orphaned role assignment removed on team deletion

- **WHEN** a team is deleted
- **THEN** all `role_assignments` and `members` rows referencing that team are cascade-deleted

### Requirement: Permission enforcement at server-function layer

Every TanStack Start server function that mutates or reads restricted resources SHALL call a
`requirePermission(ctx, permission)` helper before executing. Unauthenticated calls SHALL return
HTTP 401. Unauthorised calls SHALL return HTTP 403.

#### Scenario: Unauthenticated request to protected endpoint

- **WHEN** a server function decorated with `requirePermission` is called without a valid session
- **THEN** the function returns HTTP 401 and the body contains `{"error":"unauthenticated"}`

#### Scenario: Authorised request proceeds

- **WHEN** a server function decorated with `requirePermission("catalog.read")` is called by a
  user with the `viewer` role
- **THEN** the function executes normally and returns the requested resource

### Requirement: Platform permission definitions

The `packages/app` package SHALL export a typed `Permission` enum covering all platform
permissions defined in OPEN_PORTAL.md: `platform.admin`, `platform.manageUsers`,
`platform.configurePlugins`, `platform.manageTeams`, `platform.viewAudit`.

#### Scenario: Permission enum exhaustive at compile time

- **WHEN** a new permission is added to the enum
- **THEN** TypeScript compilation fails at any switch/case that does not handle the new value
  (exhaustive check)
