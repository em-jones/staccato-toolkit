# 0003. Adopt Node.js v24

**Date:** 2026-02-25

## Status
Accepted

## Context

Backstage requires a Node.js runtime for building and serving the developer portal frontend. We need a stable, performant runtime with long-term support (LTS) and modern JavaScript features.

Node.js v24 provides:
- Enhanced performance with V8 engine improvements
- Native support for ES modules and import maps
- Improved TypeScript integration
- Security updates and LTS lifecycle

Alternatives considered:
- **Node.js v20 LTS**: Stable but missing latest performance improvements
- **Deno**: Modern runtime but incompatible with Backstage ecosystem
- **Bun**: Fast but immature ecosystem and tooling

## Decision

Adopt Node.js v24 as the runtime for all Backstage frontend services and build tooling.

All local development environments, CI/CD pipelines, and production deployments must use Node.js v24.x. Package managers must be compatible with Node.js v24 (yarn v4, npm v10+).

## Consequences

**Easier:**
- Modern JavaScript features (top-level await, import assertions)
- Improved build performance for TypeScript and bundling
- Strong ecosystem compatibility with Backstage
- Security patches and LTS support until 2027

**Harder:**
- Requires Node.js v24 across all development machines
- Some legacy npm packages may have compatibility issues
- Docker base images must support Node.js v24

**Maintenance implications:**
- CI/CD pipelines must pin Node.js v24.x
- Devbox configuration must specify Node.js v24
- Container images must use Node.js v24 base images
- Migration to Node.js v26 LTS required before v24 EOL

## Related Decisions

- ADR-0002: Adopt TypeScript + React for frontend
- ADR-0019: Yarn workspaces for monorepo structure
- ADR-0018: Devbox for consistent environments
- Tech Radar: Node.js v24 marked as "Adopt"
