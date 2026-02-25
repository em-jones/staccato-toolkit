---
td-board: adopt-golang-monorepo
td-issue: td-77c2c4
status: accepted
date: 2026-02-24
decision-makers: [platform-architect-agent]
---

# Design: Adopt Golang Monorepo

## Context and problem statement

The project is beginning development of the staccato toolkit — a system comprising a CLI, a server, and a shared domain layer. Without a workspace structure, each module would be developed in isolation, making cross-module builds, shared tooling, and consistent dependency management difficult. A Go workspace (`go.work`) at the repo root is the idiomatic solution for Go monorepos, providing workspace-aware builds without requiring modules to be published.

## Decision criteria

This design achieves:

- **Module isolation** (40%): each component has its own `go.mod` and version boundary
- **Workspace-level builds** (40%): all modules buildable from the repo root without directory switching
- **Tooling consistency** (20%): single Go version, devbox-managed, uniform structure

Explicitly excludes:

- Runtime behaviour of CLI, server, or domain (scaffold only — behaviour defined in later changes)
- External package management or private module proxies
- CI/CD pipeline integration (tracked separately)

## Considered options

### Option 1: Single `go.mod` at the repo root

All toolkit code under one module. Simpler initially, but couples unrelated components (`ops/workloads` dagger module uses a distinct module path `dagger/workloads` that cannot be unified) and prevents independent versioning of CLI, server, and domain.

**Rejected**: incompatible with the existing `src/ops/workloads` module structure and prevents future independent release of toolkit components.

### Option 2: Go workspace (`go.work`) at repo root (selected)

Each component has its own `go.mod`; `go.work` links them all. Go tooling resolves inter-module imports locally without publishing. Aligns with the existing `src/ops/workloads` pattern.

**Selected**: idiomatic for Go monorepos, compatible with existing structure, zero runtime overhead.

### Option 3: Separate repositories per component

Each toolkit component lives in its own repo. Maximally isolated but introduces significant operational overhead for a project at this stage.

**Rejected**: premature for the current scale; cross-component changes would require coordinated multi-repo PRs.

## Decision outcome

Use Go workspaces (`go.work`) at the repo root. Each component (`cli`, `server`, `domain`, `ops/workloads`) has its own `go.mod` with an independent module path under `github.com/staccato-toolkit/<component>`. The workspace file includes all four modules as `use` directives. Module scaffold files (`main.go` for executables, `<package>.go` for libraries) are minimal — behaviour is deferred to subsequent changes.

## Risks / trade-offs

- Risk: `go.work` is gitignored by default in some templates → Mitigation: ensure `go.work` is committed and not in `.gitignore`
- Risk: `go.work.sum` divergence across developer environments → Mitigation: run `go work sync` after any module change; document in devbox init hook if needed
- Trade-off: `go.work` is not respected by `go get` or published module resolution — cross-module imports only work within the workspace. Acceptable at this stage; resolved if/when modules are published.

## Migration plan

1. `go.work` and module scaffolds already created (this change)
2. Verify: `go build github.com/staccato-toolkit/cli github.com/staccato-toolkit/server github.com/staccato-toolkit/domain` from repo root succeeds
3. No rollback needed — scaffold files have no production impact

## Confirmation

- `go work sync` succeeds at repo root with no errors
- `go build` succeeds for all four modules from workspace root
- `go.work` contains `use` directives for all four module directories

## Open questions

- Module path prefix: using `github.com/staccato-toolkit/<component>` — confirm if the organisation/repo structure changes this prefix
- Whether `staccato-cli` should depend on `staccato-domain` from the start or defer that wiring to the next change

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| `code/naming` | platform-architect-agent | `patterns/code/naming.md` | reviewed |
| `code/functions` | platform-architect-agent | `patterns/code/functions.md` | reviewed |
| `code/error-handling` | platform-architect-agent | `patterns/code/error-handling.md` | reviewed |
| `code/testing` | platform-architect-agent | `patterns/code/testing.md` | reviewed |
| `code/solid` | platform-architect-agent | `patterns/code/solid.md` | reviewed |
| `code/functional-design` | platform-architect-agent | `patterns/code/functional-design.md` | reviewed |
| `architecture/repository-layout` | platform-architect-agent | `patterns/architecture/repository-layout.md` | reviewed |
| `architecture/boundaries` | platform-architect-agent | `patterns/architecture/boundaries.md` | reviewed |
| `delivery/quality-tooling` | platform-architect-agent | `patterns/delivery/quality-tooling.md` | reviewed |
| `delivery/observability` | platform-architect-agent | `patterns/delivery/observability.md` | reviewed |
| `operations/reliability` | platform-architect-agent | `patterns/operations/reliability.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Go workspace (`go.work`) | all | — | none | Go workspace is a standard Go toolchain feature; no custom skill needed |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | staccato-cli | create | platform-team | `.entities/component-staccato-cli.yaml` | declared | New CLI module introduced by this change |
| Component | staccato-server | create | platform-team | `.entities/component-staccato-server.yaml` | declared | New server module introduced by this change |
| Component | staccato-domain | create | platform-team | `.entities/component-staccato-domain.yaml` | declared | New domain library module introduced by this change |
