# 0019. Yarn Workspaces Monorepo

**Date:** 2026-02-25

## Status
Accepted

## Context

Backstage is a monorepo containing multiple packages (plugins, backend modules, frontend components). We need a package manager that supports workspace management, dependency hoisting, and efficient installs.

**Yarn Workspaces** (Yarn v4) provides:
- Monorepo support with shared dependencies
- Plug'n'Play (PnP) for faster installs and deterministic resolution
- Workspace protocol for cross-package dependencies
- Built-in support for Backstage's architecture

Alternatives considered:
- **npm workspaces**: Basic monorepo support but slower and less feature-rich
- **pnpm**: Fast and efficient but less ecosystem adoption for Backstage
- **Lerna**: Monorepo orchestration but requires Yarn/npm underneath
- **Turborepo**: Build orchestration but not a package manager

Backstage officially recommends Yarn workspaces, and the ecosystem tooling is optimized for Yarn.

## Decision

Adopt Yarn v4 with workspaces for managing the Backstage monorepo.

The repository must:
- Use `yarn.lock` for deterministic dependency resolution
- Define workspace packages in root `package.json`
- Use workspace protocol (`workspace:*`) for internal dependencies
- Configure Yarn PnP for faster installs (if compatible)

## Consequences

**Easier:**
- Efficient dependency management across multiple packages
- Shared dependencies hoisted to root (reduces duplication)
- Fast installs with Yarn PnP or zero-installs
- Native Backstage ecosystem compatibility
- Workspace commands for running scripts across packages

**Harder:**
- Yarn v4 learning curve (different from Yarn v1)
- PnP compatibility issues with some legacy packages
- Workspace dependency resolution can be complex
- Requires Yarn v4 on all developer machines and CI

**Maintenance implications:**
- `yarn.lock` must be committed and kept up to date
- Workspace dependencies must use `workspace:*` protocol
- Dependency upgrades require testing across all packages
- CI/CD must use Yarn v4 for installs and builds
- Backstage upgrades may require Yarn compatibility checks

## Related Decisions

- ADR-0002: Adopt TypeScript + React for frontend
- ADR-0003: Adopt Node.js v24 for runtime
- ADR-0018: Devbox for consistent environments (pins Yarn version)
- Existing ADR: `yarn-workspace-strategy.md`
