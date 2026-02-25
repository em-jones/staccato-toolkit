---
td-board: document-yarn-workspace-strategy-yarn-dependency-usage-rules
td-issue: td-39e256
---

# Specification: Yarn Dependency Usage Rules

## Overview

Defines the canonical pattern rules governing how dependencies are declared, managed, and isolated across workspace packages in the monorepo using Yarn 4.12.0.

## ADDED Requirements

### Requirement: Workspace isolation and dependency scoping rules

The repository SHALL have a pattern rule at `.opencode/rules/patterns/architecture/yarn-workspaces.md` that defines how dependencies are scoped and isolated across workspace packages, including workspace-local dependencies and external dependency constraints.

#### Scenario: Rule defines workspace package organization

- **WHEN** a developer consults the Yarn workspaces pattern rule
- **THEN** it documents how workspace packages are organized (e.g., `src/<system>/<component>/package.json`) and why internal packages are isolated from the root

#### Scenario: Rule specifies dependency declaration standards

- **WHEN** the rule is reviewed
- **THEN** it specifies:
  - **Root `package.json`**: Contains only workspace definitions and shared scripts; NO application dependencies
  - **Package `package.json`**: Contains dependencies required by that package only
  - **Constraint**: No hoisting of dependencies to the root; each package declares its own

#### Scenario: Rule addresses transitive dependency consistency

- **WHEN** a developer adds a dependency used by multiple packages
- **THEN** the rule specifies how to ensure version consistency (e.g., shared versions in root `resolutions`, or independent versioning where justified with documented tradeoffs)

#### Scenario: Rule documents workspace-local imports

- **WHEN** one workspace package imports from another
- **THEN** the rule specifies the import path convention (e.g., `import from '@staccato/domain'` for internal packages with published names)

### Requirement: Yarn version pinning and lock file governance

The repository SHALL have a pattern rule at `.opencode/rules/patterns/delivery/yarn-lock-management.md` that governs Yarn version pinning, lock file commitment, and reproducible installs across CI and local environments.

#### Scenario: Rule enforces Yarn version pinning

- **WHEN** developers or CI run Yarn commands
- **THEN** the rule specifies that `package.json` MUST declare Yarn version in the `packageManager` field (e.g., `yarn@4.12.0+sha512...`)

#### Scenario: Rule requires lock file commitment

- **WHEN** Yarn dependencies are modified
- **THEN** the rule specifies that `.yarn/` cache and lock artifacts MUST be committed to git to enable reproducible installs

#### Scenario: Rule documents CI/local synchronization

- **WHEN** a developer or CI pipeline runs `yarn install`
- **THEN** the rule guarantees that both environments install identical dependency versions and plugin configurations

### Requirement: Plug'n'Play (PnP) mode configuration and compatibility

The repository SHALL have a pattern rule at `.opencode/rules/patterns/delivery/yarn-pnp-strategy.md` that documents Yarn's plug'n'play mode, its benefits for monorepos, and compatibility considerations with tooling.

#### Scenario: Rule explains PnP benefits

- **WHEN** a developer reads the rule
- **THEN** it documents why Yarn PnP is enabled:
  - Zero-install capability (install artifacts cached in `.yarn/cache`)
  - Strict dependency isolation (prevents accidentally importing undeclared transitive dependencies)
  - Deterministic builds and reduced CI time

#### Scenario: Rule documents PnP compatibility matrix

- **WHEN** a developer adds a new tool or dependency
- **THEN** the rule documents known compatibility constraints (e.g., which bundlers, test runners, and linters work with PnP) and workarounds

#### Scenario: Rule specifies PnP adoption path

- **WHEN** a developer works with PnP mode
- **THEN** the rule clarifies migration from non-PnP installs (`.node_modules` directory elimination) and any one-time configuration needed

### Requirement: Dependency audit and vulnerability scanning integration

The repository SHALL document in a pattern rule at `.opencode/rules/patterns/delivery/yarn-dependency-audit.md` how vulnerability scanning, audit checks, and dependency updates are governed in the Yarn workspace.

#### Scenario: Rule specifies audit tooling

- **WHEN** the rule is reviewed
- **THEN** it documents:
  - Yarn built-in `yarn audit` for vulnerability detection
  - Integration with CI/CD for automated audit checks
  - Escalation path for high-severity vulnerabilities

#### Scenario: Rule governs dependency upgrades

- **WHEN** a developer or automated process upgrades dependencies
- **THEN** the rule specifies:
  - Major version upgrades require testing across affected packages
  - Minor version upgrades can be applied with `yarn upgrade-interactive`
  - Lock file must be re-committed after upgrades
