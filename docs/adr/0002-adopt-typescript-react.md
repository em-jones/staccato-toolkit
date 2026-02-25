# 0002. Adopt TypeScript + React

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec integrates with Backstage, a developer portal platform built on React. We need a frontend technology stack that provides type safety, modern UI capabilities, and seamless integration with Backstage's plugin architecture.

Alternatives considered:
- **Vue.js**: Strong framework but incompatible with Backstage ecosystem
- **Angular**: Mature but heavier framework with different component model
- **Plain JavaScript + React**: Lacks compile-time type safety and IDE support

TypeScript provides static typing, excellent IDE integration, and catches errors at compile time. React's component-based architecture and extensive ecosystem align with Backstage's plugin system.

## Decision

Adopt TypeScript + React as the frontend stack for all Backstage plugins and UI components within OpenSpec.

All frontend code must use TypeScript with strict mode enabled. React components follow functional patterns with hooks rather than class-based components.

## Consequences

**Easier:**
- Type safety catches errors before runtime
- Excellent IDE support (autocomplete, refactoring, inline documentation)
- Seamless integration with Backstage plugin APIs
- Rich ecosystem of React libraries and components
- Strong community support and documentation

**Harder:**
- Requires TypeScript knowledge across frontend team
- Type definitions needed for third-party libraries
- Build toolchain complexity (transpilation, bundling)

**Maintenance implications:**
- All plugins must maintain TypeScript strict mode compliance
- Type definitions must be kept in sync with runtime behavior
- Backstage version upgrades may require type compatibility updates

## Related Decisions

- ADR-0003: Adopt Node.js v24 for Backstage runtime
- ADR-0005: Adopt Material-UI for component library
- ADR-0019: Yarn workspaces for monorepo structure
- Usage rule: Backstage plugin development patterns
