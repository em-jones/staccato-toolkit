# ADR: Yarn 4.12.0 as Monorepo Package Manager and Workspace Tool

**Status**: Accepted  
**Date**: 2026-02-25  
**Decision makers**: Platform Architecture Team  
**Consulted**: Full-stack developers, DevOps, CI/CD  
**Informed**: All platform contributors  

---

## Problem Statement

The repository is structured as a Go monorepo with `go.work` for unified builds and dependency management. As the platform evolved, Node.js tooling became necessary for complementary tools and documentation systems. A monorepo workspace tool for JavaScript/TypeScript packages was needed to:

- Unify multiple npm packages (CLI, web UIs, tooling) under a single dependency management strategy
- Enforce workspace isolation and prevent accidental cross-package transitive dependency usage
- Enable reproducible installs across CI and local development environments
- Support zero-install capability for faster CI builds

## Decision Context

The monorepo is the primary organizational structure for the Staccato platform. Go modules are unified via `go.work` at the repo root, providing:
- Unified builds across all Go packages
- Consistent dependency resolution via workspace-aware tooling
- Clear boundaries between internal and external dependencies

A similar solution was needed for JavaScript/TypeScript packages to provide equivalent ergonomics and safety guarantees.

## Alternatives Considered

### 1. npm workspaces (npm >= 7.0)

**Pros**:
- Built into npm, no additional tooling required
- Uses standard `package.json` with `workspaces` array
- Wide tooling support and community familiarity

**Cons**:
- Hoisting of dependencies to root `node_modules` can mask accidental transitive imports
- Slower `npm install` for large monorepos (flat `node_modules` structure has performance issues)
- Inconsistent dependency resolution across different Node.js versions
- No zero-install capability; must download and install all dependencies each run
- Less mature than Yarn for strict workspace isolation

**Decision**: Rejected — dependency isolation and performance were critical requirements. Yarn's plug'n'play mode addresses both.

### 2. Bun (bun >= 1.0)

**Pros**:
- Extremely fast dependency installation
- All-in-one toolset (package manager, bundler, test runner)
- Modern design without npm/Yarn legacy baggage

**Cons**:
- Early-stage maturity (1.x at time of decision)
- Ecosystem compatibility concerns (tooling, CI integration)
- Smaller community and fewer success stories in large monorepos
- Lock file format still evolving; stability questions for long-term maintenance
- IDE integration (TypeScript, linting) was incomplete

**Decision**: Rejected — maturity and ecosystem compatibility were not yet sufficient. Revisit in 12 months when bun stabilizes.

### 3. pnpm (pnpm >= 6.0)

**Pros**:
- Superior dependency isolation via symlinked node_modules
- Fast installation and caching strategy
- Good monorepo support via `pnpm-workspace.yaml`
- Growing ecosystem adoption

**Cons**:
- Smaller ecosystem than npm/Yarn — tooling integration is often a step behind
- Node.js peer dependency handling can be confusing
- `pnpm-workspace.yaml` adds another configuration file type
- Not as widely adopted in the Go/Rust communities we're integrating with

**Decision**: Rejected — Yarn's combination of maturity, plug'n'play mode, and tooling integration was superior for our use case. Consider if pnpm's speed becomes a bottleneck.

### 4. Yarn 4.x with Plug'n'Play (selected)

**Pros**:
- **Strict dependency isolation**: PnP mode prevents accidental transitive imports
- **Zero-install capability**: Cached dependencies in `.yarn/cache/` enable CI builds without install step
- **Mature ecosystem**: Yarn 4.x is stable and widely adopted in large monorepos
- **Workspace support**: Native workspace isolation with clear package boundaries
- **Lock file determinism**: `.yarn.lock` guarantees identical installs across environments
- **Tooling integration**: TypeScript, linters, test runners have robust Yarn support
- **Developer experience**: Clear error messages for dependency violations
- **CI/CD efficiency**: Zero-install caching reduces CI time substantially

**Cons**:
- Plug'n'Play compatibility requires attention to certain bundlers and tools
- Slightly larger learning curve for developers unfamiliar with modern package managers
- `.yarn/` directory must be committed to git (larger repo, but acceptable tradeoff)

**Decision**: Accepted — best balance of maturity, isolation guarantees, performance, and ecosystem support.

---

## Decision Outcome

### Chosen: Yarn 4.12.0

The platform SHALL use **Yarn 4.12.0** as the package manager and monorepo workspace tool for all JavaScript/TypeScript packages.

**Key facts**:
- Version is pinned in `package.json` via `packageManager` field: `yarn@4.12.0+sha512...`
- Plug'n'Play (PnP) mode is enabled to enforce strict dependency isolation
- Lock file (`.yarn.lock`) and cache (`.yarn/cache/`) are committed to git for reproducible installs
- Workspace packages are declared in root `package.json` with `workspaces` array
- Each package has its own `package.json` declaring only its direct dependencies

### Rationale

1. **Isolation**: Prevents dependency confusion and transitive dependency accidents — critical for large monorepos
2. **Reproducibility**: Lock file + cache in git ensures identical installs across CI and local environments
3. **Performance**: PnP + zero-install caching dramatically reduces CI build time vs. traditional node_modules
4. **Maturity**: Yarn 4.x is stable and battle-tested in large-scale monorepos (e.g., Google, Facebook internal projects)
5. **Ecosystem**: TypeScript, ESLint, Jest, Webpack all have robust Yarn support
6. **Consistency**: Aligns with monorepo philosophy already established by Go `go.work` workspace

---

## Consequences

### Immediate

- All developers must use Yarn for package management (no npm/pnpm/bun)
- CI/CD must use Yarn for consistent installs
- IDE/editor configuration must accommodate Yarn PnP (TypeScript, linters)
- Documentation updated to reflect Yarn as the canonical package manager

### Future Considerations

- **Bun adoption**: If Bun reaches 2.0+ maturity and ecosystem support stabilizes, revisit this decision
- **PnP incompatibility**: Monitor tools that don't support PnP; create workarounds or migrate if ecosystem support improves
- **Performance bottlenecks**: If Yarn becomes a CI bottleneck despite zero-install caching, evaluate pnpm/Bun alternatives
- **Lock file drift**: Establish lockfile validation and audit practices to prevent dependency security gaps

### Constraints

- Node.js version must be compatible with Yarn 4.12.0 (requires Node.js 18+)
- Any external tool integrations must support or tolerate Yarn workspaces
- Package scripts in CI must use `yarn` command, not `npm`

---

## Validation & Reconsideration Criteria

This decision should be **reconsidered** if:

1. **Maturity threshold**: Bun or pnpm reaches equivalent or superior ecosystem maturity and adds significant value (speed, simplicity)
2. **Tooling gaps**: PnP compatibility issues become pervasive and block key developer workflows
3. **Performance regression**: Yarn becomes a measurable CI bottleneck despite caching (e.g., PnP resolution cost > 2min per run)
4. **Community drift**: Yarn project or community support declines; ecosystem adoption drops significantly
5. **Lock file stability**: `.yarn.lock` format or Yarn versioning becomes a maintenance burden

**Review cadence**: Annually (next review: Feb 2027)

---

## References

- [Yarn 4.0 Announcement](https://dev.to/arcanis/yarn-4-corepack-esm-pnpm-interop-3nch)
- [Plug'n'Play Documentation](https://yarnpkg.com/features/pnp)
- [Monorepo Workspace Design](https://classic.yarnpkg.com/en/docs/workspaces/)
- [Clean Architecture - Monorepo Patterns](https://www.oreilly.com/library/view/clean-code/9780136083238/) (Martin, Ch. 15–16)
