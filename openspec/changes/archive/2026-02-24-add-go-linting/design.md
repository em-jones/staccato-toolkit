---
td-board: add-go-linting
td-issue: td-2e8e25
status: accepted
date: 2026-02-24
---

# Design: Add Go Linting Tooling

## Context

The monorepo now contains four Go modules (introduced in `adopt-golang-monorepo`, td-77c2c4):
- `src/staccato-toolkit/cli`
- `src/staccato-toolkit/server`
- `src/staccato-toolkit/domain`
- `src/ops/workloads`

Currently, **no linting is configured** for these modules. The existing CI pipeline (`.github/workflows/ci.yml`) runs `dagger call lint`, which already has support for golangci-lint — it checks for `.golangci.yml` and runs the linter if found. However, because no configuration file exists, it returns "no linter configured."

We need to:
1. Add a golangci-lint configuration file
2. Ensure the tool is available in development environments
3. Verify CI integration works correctly

## Decision

**We will use `golangci-lint` with a single `.golangci.yml` configuration file at the repository root.**

### Configuration approach

- **Single config at root**: `.golangci.yml` at repository root covers all Go modules
- **Sensible defaults**: Enable a balanced set of linters:
  - Code formatting: `gofmt`, `goimports`
  - Error checking: `errcheck`, `govet`
  - Complexity: `gocyclo`
  - Unused code: `unused`, `deadcode`
  - Security: `gosec`
- **Version pinning**: golangci-lint version will be pinned in `devbox.json` to ensure consistency

### Integration points

1. **Development environment**: Add `golangci-lint` to `devbox.json` packages
2. **CI pipeline**: Existing dagger Lint function will automatically detect `.golangci.yml` and run golangci-lint
3. **Workspace scope**: Linter runs from root and analyzes all Go modules in the workspace

### Implementation tasks

- Create `.golangci.yml` with appropriate rule configuration (td-46a1b2)
- Add `golangci-lint` to `devbox.json` (td-033364)
- Verify dagger Lint function integration (td-00ac24)
- Ensure CI lint job passes (td-aae833)

## Alternatives Considered

### Per-module configurations

**Approach**: Create separate `.golangci.yml` files in each Go module directory.

**Rejected because**:
- The dagger workspace builds from the repository root
- Managing four separate configs adds unnecessary complexity
- All modules follow the same Go standards; no need for divergent rules
- Single config is easier to maintain and evolve

### Different linter (e.g., staticcheck alone)

**Approach**: Use a simpler linter like standalone staticcheck.

**Rejected because**:
- golangci-lint is the industry standard and includes staticcheck plus many others
- Existing dagger Lint function already supports golangci-lint
- golangci-lint provides more comprehensive coverage with one tool

## Risks and Mitigations

### Risk: Version drift

**Risk**: golangci-lint updates could introduce new rules that break CI.

**Mitigation**: 
- Pin golangci-lint version in `devbox.json`
- Explicitly version updates as part of dependency maintenance
- Test locally before pushing changes

### Risk: Existing code violations

**Risk**: Enabling linting may reveal existing issues in Go modules.

**Mitigation**:
- This is actually desirable — we want to find and fix quality issues
- Initial implementation can use `--fix` flag to auto-correct simple issues
- More complex violations can be addressed incrementally or with linter exclusions if justified

### Risk: Configuration too strict or too loose

**Risk**: Rules may be overly strict (blocking legitimate code) or too permissive (missing real issues).

**Mitigation**:
- Start with sensible defaults based on Go community standards
- Iterate on configuration based on team feedback
- Document any disabled rules with rationale

## Technology Adoption

| Domain | Status | Notes |
|--------|--------|-------|
| `delivery/quality-tooling` | Reviewed | Existing pattern domain; golangci-lint follows established quality tooling practices |
| `delivery/ci-cd` | Reviewed | Integration with existing dagger Lint function; no new CI patterns needed |

**No new pattern domains required.** This change applies existing quality tooling and CI/CD patterns to Go code.

## Agent Skills

**None required.** Standard implementation tasks; no specialized agent workflows needed.

## Catalog Entities

**Not applicable.** This change introduces tooling configuration, not runtime services or components.

---

## Cross-Cutting Concerns

### CI Integration

**Issue**: td-d9fa7d

The dagger Lint function already has golangci-lint support built in. Once `.golangci.yml` exists at the repository root:

1. Dagger detects the config file
2. Runs `golangci-lint run` on all Go modules
3. Reports violations as CI failures

**No code changes needed** — the integration is already implemented. This task verifies that the integration works correctly once the configuration file is in place.

### Developer Experience

Developers can run linting locally via:
- `devbox shell` → `golangci-lint run` (direct invocation)
- `dagger call lint` (same as CI)

Both approaches use the same `.golangci.yml` configuration, ensuring consistency between local and CI environments.
