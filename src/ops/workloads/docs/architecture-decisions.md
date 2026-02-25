# Architecture Decisions

This document records the key architectural decisions for the Platform Workloads Dagger CI/CD module.

## ADR-001: Why Dagger for CI/CD Orchestration

**Status**: Accepted (2026-02-25)

**Decision**: Use Dagger (v0.19.11) with the Go SDK as the canonical CI/CD orchestration platform.

**Rationale**:
1. **Container Isolation**: All pipeline tasks execute within isolated containers, ensuring reproducible behavior between local development and CI/CD environments
2. **Language Agnostic**: Dagger's GraphQL execution engine decouples the orchestration model from implementation languages, allowing tasks to be written in Go, Python, TypeScript, or other languages in the future
3. **Efficient Caching**: Dagger automatically manages layer caching and dependency caching, reducing rebuild times and network overhead
4. **Composability**: Tasks can be chained into multi-stage pipelines without explicit shell orchestration or shell script syntax
5. **Developer Experience**: A single `dagger call <task>` invocation works identically in local development (after `devbox shell`) and in GitHub Actions CI/CD

**Alternatives Considered**:
- **Direct Tool Invocation** (golangci-lint, yarn test, etc. directly in shell scripts)
  - ❌ Rejected: Host environment variation, difficult to reproduce issues, inconsistent between developers and CI
- **Bash-based Pipeline** (shell scripts orchestrating tools)
  - ❌ Rejected: Language fragmentation, difficult to compose, platform-dependent
- **GitHub Actions Only** (implement all logic in workflow.yml)
  - ❌ Rejected: Not reproducible locally, strong vendor lock-in, verbose workflow syntax

**Consequences**:
- All developers must have Dagger installed (provided by devbox)
- Tasks must be written to execute in containers (enables portability and reproducibility)
- New dependencies on the Dagger engine and SDK

---

## ADR-002: Go SDK for Dagger Module Implementation

**Status**: Accepted (2026-02-25)

**Decision**: Implement all Dagger tasks using the Go SDK (dagger-io/dagger v0.19.11).

**Rationale**:
1. **Alignment with Repository Stack**: The Staccato Toolkit repository is primarily Go-based (CLI, server, domain modules)
2. **Type Safety**: Go's static typing catches errors at compile time (method signatures, parameter types)
3. **Performance**: Compiled Go tasks execute faster than interpreted languages
4. **Dependency Hygiene**: Go modules integrate seamlessly with the repository's go.work workspace
5. **Dagger SDK Maturity**: The Go SDK is feature-complete and well-documented

**Alternatives Considered**:
- **TypeScript/JavaScript SDK**
  - ❌ Rejected: Requires Node.js, additional runtime dependency
- **Python SDK**
  - ❌ Rejected: Repository is not Python-based; adds new language runtime
- **Shell/Bash Tasks**
  - ❌ Rejected: Not supported by Dagger (Dagger tasks must be in a supported SDK language)

**Consequences**:
- Developers must know Go to extend the Dagger module
- Type safety and compile-time feedback for task definitions
- Integration with Go tooling (gofmt, go vet, etc.)

---

## ADR-003: Container Isolation Model

**Status**: Accepted (2026-02-25)

**Decision**: All pipeline tasks execute within isolated containers. No task modifies the host filesystem directly.

**Rationale**:
1. **Reproducibility**: Container images are immutable and version-pinned, ensuring tasks behave identically across environments
2. **Isolation**: Task side effects are contained to the container; host pollution is impossible
3. **Portability**: Tasks work on any machine that can run containers (Linux, macOS, Windows)
4. **Determinism**: Environment dependencies (tools, libraries) are explicit and version-controlled

**Implementation**:
- All tasks receive a `source *Directory` parameter representing the repository root
- Tasks mount the source directory into a container using `WithMountedDirectory()`
- Tasks invoke commands inside the container using `WithExec()`
- Output is captured and returned to the caller

**Consequences**:
- Container image pulls on first run or after image updates (mitigated by Dagger caching)
- Minimal performance overhead compared to native tools (acceptable for CI/CD context)
- Docker or container runtime must be available

---

## ADR-004: Multi-Module Workspace Support

**Status**: Accepted (2026-02-25)

**Decision**: The Platform module detects and supports both single-module and multi-module (go.work) layouts.

**Rationale**:
1. **Flexibility**: Repositories may grow from single module to workspace layout
2. **Automatic Detection**: Tasks check for `go.work` file and adjust behavior accordingly
3. **Backward Compatibility**: Existing single-module repositories continue to work without modification

**Implementation**:
- Tasks (e.g., `Test()`, `Build()`) check for `go.work` file in the source root
- If `go.work` exists: iterate over listed modules and run commands per-module
- If `go.work` does not exist: run commands on the source root (single-module layout)

**Consequences**:
- Task logic includes branching for multi-module detection (acceptable complexity)
- Clear error messages if a module build fails (helpful for debugging)

---

## ADR-005: Graceful Handling of Missing Tools

**Status**: Accepted (2026-02-25)

**Decision**: If a pipeline task depends on a tool that is not configured (e.g., no linter config found), the task SHALL return a clear message and exit with code 0 (success).

**Rationale**:
1. **CI Pipeline Robustness**: CI should not fail because a tool is not used; the absence of a tool is not an error
2. **Developer Flexibility**: Teams can selectively adopt tools without affecting other repositories
3. **Clear Feedback**: Task output explains why the tool was skipped (enables debugging)

**Example**:
```go
// Lint task: no linter config found
return "no linter configured", nil  // exit code 0, not 1
```

**Consequences**:
- Task output must be clear enough to distinguish between "tool not configured" and "tool executed with issues"
- Teams must explicitly enable tools via configuration files (e.g., `.golangci.yml`)

---

## ADR-006: Caching Strategy

**Status**: Accepted (2026-02-25)

**Decision**: Leverage Dagger's automatic caching strategy for container layers, dependencies, and build artifacts.

**Rationale**:
1. **Performance**: Automatic caching speeds up repeated task invocations without manual intervention
2. **Transparency**: Developers do not need to understand cache implementation details
3. **Consistency**: Caching behaves identically in local development and CI/CD (Dagger manages its own cache store)

**Caching Layers**:
1. **Container Layer Cache**: Image layers are cached; rebuilding the same image reuses cached layers
2. **Dependency Cache**: Downloaded dependencies (Go modules, npm packages) are cached within the Dagger store
3. **Build Artifact Cache**: Build outputs are cached; unchanged source code skips rebuild steps

**Consequences**:
- Cache storage grows over time (mitigated by periodic cache cleanup)
- Cache invalidation is automatic and correct (no need for explicit cache busting)
- Local and CI cache are independent (no cross-environment cache sharing)

---

## ADR-007: Secrets Handling

**Status**: Accepted (2026-02-25)

**Decision**: Secrets (API tokens, registry credentials) are passed to Dagger tasks via environment variables or Dagger's secret API. Secrets are never logged or exposed in task output.

**Rationale**:
1. **Security**: Sensitive data is isolated from logs and output
2. **Flexibility**: Supports both local development (env vars, secret input) and CI/CD (GitHub Actions secrets)
3. **Auditing**: Dagger masks secrets in output, creating an audit trail

**Implementation**:

*Local Development*:
```bash
export MY_TOKEN="secret-value"
dagger call deploy --secret registry-token=$MY_TOKEN
```

*GitHub Actions*:
```yaml
- name: Deploy
  env:
    REGISTRY_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
  run: dagger call deploy --secret registry-token=$REGISTRY_TOKEN
```

**Consequences**:
- Tasks must not hardcode secrets or expose them via string concatenation
- Teams must configure secrets in GitHub Actions settings
- Local development requires manual secret injection (not automated)

---

## ADR-008: Task Naming Conventions

**Status**: Accepted (2026-02-25)

**Decision**: Task methods in the `Platform` type use CapitalCase names (Go convention). CLI invocations use lowercase task names (user-friendly).

**Rationale**:
1. **Go Convention**: Exported Go identifiers follow CapitalCase
2. **User Friendliness**: CLI tasks are lowercase and familiar (matches docker, kubectl conventions)
3. **Auto-conversion**: Dagger automatically converts method names to lowercase CLI invocations

**Example**:
- Go method: `func (m *Platform) Lint(...) (...)`
- CLI invocation: `dagger call lint`

**Consequences**:
- Developers must remember to use CapitalCase in Go code and lowercase for CLI
- Clear separation between implementation and invocation patterns

---

## ADR-009: Local vs. CI Execution Parity

**Status**: Accepted (2026-02-25)

**Decision**: Task behavior is identical in local development and GitHub Actions CI/CD environments. Environment differences (cache backend, secret sourcing) are transparent to tasks.

**Rationale**:
1. **Predictability**: Developers can debug and validate changes locally before pushing
2. **Reproducibility**: A passing local run predicts a passing CI run (barring network issues)
3. **Developer Confidence**: Reduces surprise failures in CI

**Implementation**:
- Tasks use only container I/O; host environment does not affect behavior
- Dagger's caching works the same in both environments (engine manages its own store)
- Secrets are sourced identically (environment variable or secret input)

**Consequences**:
- Tasks must not depend on local tools or host environment
- CI failures due to environment differences are rare (easier debugging)

---

## Future Considerations

1. **Dagger Version Upgrades**: Pinned at v0.19.11. Upgrade strategy TBD.
2. **Multi-Language Task Support**: Go-only today; TypeScript/Python tasks may be added in the future.
3. **Task Composition**: Passing outputs from one task to another is currently manual (via shell piping). Future Dagger versions may support first-class composition.
4. **Performance Optimization**: Cache tuning and layer analysis could improve CI runtime in the future.

