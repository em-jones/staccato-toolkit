---
created-by-change: adopt-dagger-ci-cd
last-validated: 2026-02-25
---

# Pattern: Dagger CI/CD Platform

## Overview

Dagger (v0.19.11) is the canonical CI/CD orchestration platform for this repository. This pattern defines the architecture, conventions, and operational model for pipeline tasks implemented using Dagger's Go SDK and GraphQL execution engine.

**Why Dagger?**
- **Container Isolation**: All tasks execute in isolated containers, ensuring reproducibility between local development and CI/CD environments
- **Language Agnostic**: Tasks are composed via GraphQL, decoupling the orchestration model from implementation languages
- **Efficient Caching**: Dagger manages automatic layer caching, reducing rebuild times and network overhead
- **Composable**: Tasks can be chained into multi-stage pipelines without explicit shell orchestration
- **Developer Experience**: Single `dagger call <task>` invocation works identically locally and in GitHub Actions

## Architecture

### Module Organization

The Dagger module is located at **`src/ops/workloads/`** and is initialized with the **Go SDK**.

**Key files**:
- `dagger.json`: Module metadata (name: `platform`, engineVersion: `v0.19.11`)
- `main.go`: Entry point (package main, no executable, serves only to satisfy the Go compiler)
- `platform.go` (or equivalent): Contains the `Platform` type with all exported methods as callable tasks

**Module Name**: `platform` (from dagger.json)
- Invoked as: `dagger call <method-name-lowercased>`
- Example: `dagger call lint --source .`

### Container Model

All pipeline tasks execute within isolated containers:

```go
// Example: Lint task structure
func (m *Platform) Lint(ctx context.Context, source *Directory) (string, error) {
    container := dag.Container().
        From("golang:1.23-alpine").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
    
    // ... linting logic ...
    
    return output, nil // or error
}
```

**Key principles**:
- Each task method accepts a `source` parameter (type `*Directory`)
- Container is constructed using Dagger's DAG API
- No modifications to the host filesystem
- All I/O is via mounted directories or returned strings
- Container image choice is motivated by task requirements (see below)

### Caching Strategy

Dagger automatically manages three layers of caching:

1. **Container Layer Cache**: Image layers are cached between runs. Rebuilding the same image (e.g., `golang:1.23-alpine`) reuses cached layers from previous invocations.

2. **Dependency Cache**: Downloaded dependencies (Go modules, npm packages) are cached automatically within the Dagger store. Subsequent runs with unchanged dependency files skip the download step.

3. **Build Artifact Cache**: Build outputs are cached by Dagger's content-addressed store. If source code or dependencies haven't changed, build steps are skipped.

**Local vs. CI**: Caching behaves identically in local development and GitHub Actions because Dagger manages its own cache store. The Actions `cache@v3` action is not required for Dagger internals but MAY be used to speed up dependency downloads if necessary.

### Secrets Handling

**Local Development**:
- Secrets can be provided via environment variables or Dagger's secret input mechanism
- Example: `dagger call build-image --secret registry-token=$MY_TOKEN`

**GitHub Actions**:
- Secrets are stored in repository settings and passed to Dagger tasks
- Example workflow:
  ```yaml
  - name: Build and push image
    env:
      REGISTRY_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
    run: dagger call build-image --secret registry-token=$REGISTRY_TOKEN
  ```
- Secrets are **never** logged or exposed in output — Dagger masks them automatically

### Local vs. CI Differences

| Aspect | Local | GitHub Actions |
|--------|-------|-----------------|
| Invocation | `dagger call <task> --source .` | `dagger call <task> --source .` (via workflow) |
| Cache store | `~/.dagger/` (or Dagger engine cache) | Dagger engine managed by `dagger/dagger-for-github@v6` action |
| Container network | Isolated (no external HTTP by default) | Isolated (same) |
| Secrets | Environment variables or `--secret` flag | GitHub Actions secrets via `--secret` flag |
| Performance | Depends on machine; layer cache benefits all runs | Cache managed by Dagger action; GitHub Actions runner cache provides additional speedup for downloaded artifacts |

**Key Point**: Task logic is identical in both environments. Differences are environmental (cache backend, secret sourcing) and do not affect task output or correctness.

## Task Conventions

### Naming and Invocation

- **Method name** (Go): CapitalCase (e.g., `Lint`, `Test`, `Build`)
- **CLI invocation**: lowercase (e.g., `dagger call lint`)
- **Rationale**: Go convention for exported identifiers + user-friendly CLI

### Function Signature

All pipeline tasks follow this signature:

```go
func (m *Platform) TaskName(ctx context.Context, source *Directory) (string, error)
```

- **Receiver**: `Platform` type
- **Context**: First parameter for cancellation and timeout support
- **Source**: Repository root mounted into the task container
- **Return**: (output string, error)
  - Success: `(output, nil)` with exit code 0
  - Failure: `(diagnostics, err)` with non-zero exit code

### Parameter Patterns

**Source Parameter**:
- All tasks receive `source *Directory` representing the repository root
- Mount pattern: `.WithMountedDirectory("/src", source)`
- Access within container: `/src`
- Read-only vs. read-write: determined by task purpose
  - **Read-only** (lint, test, analyze): prevents accidental file modifications
  - **Read-write** (format, generate): allows modifications if task produces output files

**Optional Parameters** (if needed):
- Additional parameters can be added after `source` (e.g., `--target`, `--flags`)
- Follow the same pattern: method parameters become CLI flags

### Container Base Image Selection

Choose base images based on task requirements and principle of least privilege:

| Task | Language/Tools | Recommended Base Image | Rationale |
|------|--------|-----|-----------|
| Go linting | Go + golangci-lint | `golang:1.23-alpine` | Built-in Go toolchain, minimal footprint |
| Shell linting | Shell scripts | `koalaman/shellcheck-alpine:stable` | Purpose-built for shellcheck, Alpine base for minimal size |
| Node.js testing | JavaScript/TypeScript | `node:20-alpine` (or project-specified) | Node.js runtime, minimal footprint |
| Container image build | Docker CLI | `docker:latest` | Docker daemon access required (use DinD if necessary) |
| Multi-language lint | Go + multiple linters | `alpine:latest` + install tools | Fallback for multi-language projects |

**Principles**:
- Prefer Alpine-based images for minimal layer size and faster pulls
- Use language-specific images (golang, node, python, etc.) for language-specific tasks
- Avoid monolithic images (e.g., `ubuntu:latest`) unless necessary
- Document the rationale for base image choice in task code comments

### Exit Behavior

**Success** (exit code 0):
- Task completes without errors
- Output is printed to stdout
- Return: `(output, nil)`

**Failure** (exit code non-zero):
- Task encounters an error (e.g., linting violations, test failure)
- Diagnostic information is returned
- Return: `(output, err)` where `err` is non-nil

**Graceful Missing Tool Handling**:
- If a required tool is not configured (e.g., no `.golangci.yml`), the task SHALL return a clear message and exit with code 0
- Example:
  ```go
  return "no linter configured", nil  // exit 0, not 1
  ```
- Rationale: Allows CI to succeed on repositories that don't use a particular tool

### Task Output

**Design Principles**:
- **Human-readable**: Output should be understandable in a terminal
- **Machine-parseable**: Where applicable (CI tools), output should be structured (JSON, XML, or standard tool format)
- **Diagnostic**: On error, include file names, line numbers, violation descriptions, or stack traces

**Examples**:

```
// Lint success
linter: golangci-lint
status: ok
no violations found

// Lint failure
linter: golangci-lint
violations:
  src/main.go:42: unused variable 'x'
  src/util.go:100: missing error check

// Test success
test summary: 127 passed, 0 failed, 3 skipped
coverage: 85%

// Test failure
test summary: 123 passed, 4 failed
failures:
  TestUserCreation (main_test.go:50): assertion failed: expected 'John', got 'jane'
  TestEmailValidation (util_test.go:120): panic: regex compilation error
```

## Multi-Stage Pipeline Orchestration

### Pipeline DAG

GitHub Actions workflows define the execution DAG using `needs:`:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: dagger call lint --source .
  
  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - run: dagger call test --source .
  
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - run: dagger call build --source .
```

**Task Sequencing**:
- Tasks within a job run sequentially
- Jobs with `needs` wait for their dependencies to complete
- Dagger tasks themselves can be chained within a job (e.g., `dagger call task1 && dagger call task2`)

### Output Chaining (Future)

Currently, Dagger tasks return output as strings. Future enhancements may allow:
- Passing task outputs as inputs to downstream tasks
- Using Dagger's type system to compose complex data structures

For now, coordinate multi-stage pipelines via GitHub Actions job dependencies and sequential shell commands.

## Usage Rules

### When to Extend the Dagger Module

**Add a new task when**:
- A developer operation should be available both locally and in CI
- The operation produces deterministic, container-isolated output
- The operation is independent of host environment

**Examples of good tasks**:
- Linting (golangci-lint, shellcheck, eslint)
- Testing (go test, jest, cargo test)
- Building (go build, cargo build, docker build)
- Code generation (protoc, swagger-codegen)
- Static analysis (semgrep, trivy)

**Examples of bad tasks**:
- Operations requiring hardware access (GPU, specific CPU)
- Operations requiring host-only tools (systemd, macOS-specific tools)
- Operations modifying version control state (git tag, git push)
- Interactive operations (prompting user input)

### When to Refactor

**Refactor when**:
- Multiple tasks share common setup (container building, dependency installation)
- A task exceeds 100 lines of code
- Task logic is difficult to test or understand

**Refactoring patterns**:
- Extract common container setup into helper functions
- Create reusable task "builders" (factory functions that return configured containers)
- Break large tasks into composition of smaller tasks

**Example** (helper function):
```go
func (m *Platform) baseGoContainer(ctx context.Context, source *Directory) *Container {
    return dag.Container().
        From("golang:1.23-alpine").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
}

func (m *Platform) Lint(ctx context.Context, source *Directory) (string, error) {
    container := m.baseGoContainer(ctx, source)
    // ... linting logic using container ...
}

func (m *Platform) Test(ctx context.Context, source *Directory) (string, error) {
    container := m.baseGoContainer(ctx, source)
    // ... test logic using container ...
}
```

## Examples

### Example 1: Lint Task (Go)

```go
// Lint runs golangci-lint against the source tree.
func (m *Platform) Lint(ctx context.Context, source *Directory) (string, error) {
    // Check for linter config
    linterConfigs := []string{".golangci.yml", ".golangci.yaml", ".golangci.json"}
    container := dag.Container().From("golang:1.23-alpine").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
    
    for _, cfg := range linterConfigs {
        if _, err := container.WithExec([]string{"test", "-f", cfg}).Sync(ctx); err == nil {
            // Config found, run linter
            out, lintErr := container.
                WithExec([]string{"apk", "add", "--no-cache", "curl"}).
                WithExec([]string{"sh", "-c", "curl -sSfL https://... | sh -s -- -b /usr/local/bin"}).
                WithExec([]string{"golangci-lint", "run"}).
                Stdout(ctx)
            if lintErr != nil {
                return fmt.Sprintf("linter config found but execution failed: %v", lintErr), lintErr
            }
            return out, nil
        }
    }
    
    return "no linter configured", nil
}
```

### Example 2: Shellcheck Task

```go
// Shellcheck runs static analysis on shell scripts.
func (m *Platform) Shellcheck(ctx context.Context, source *Directory) (string, error) {
    out, err := dag.Container().
        From("koalaman/shellcheck-alpine:stable").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src").
        WithExec([]string{"sh", "-c", `find . -name "*.sh" -not -path "./node_modules/*" -not -path "./.devbox/*" | xargs shellcheck`}).
        Stdout(ctx)
    
    if err != nil {
        return out, err
    }
    return out, nil
}
```

### Example 3: Build Task (Multi-language)

```go
// Build produces build artifacts or validates the project builds.
func (m *Platform) Build(ctx context.Context, source *Directory) (string, error) {
    container := dag.Container().From("golang:1.23-alpine").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
    
    // Check for go.work (workspace layout)
    if _, err := container.WithExec([]string{"test", "-f", "go.work"}).Sync(ctx); err == nil {
        // Multi-module build
        out, buildErr := container.WithExec([]string{"go", "build", "./..."}).Stdout(ctx)
        if buildErr != nil {
            return fmt.Sprintf("build failed: %v", buildErr), buildErr
        }
        return out, nil
    }
    
    // Fallback to npm
    return m.buildWithNpm(ctx, source)
}
```

## Integration with CI/CD Pipeline

### GitHub Actions Integration

The `.github/workflows/ci.yml` workflow invokes Dagger tasks on push and PR:

```yaml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
        with:
          version: latest
      - run: dagger call lint --source .
      - run: dagger call shellcheck --source .

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
      - run: dagger call test --source .

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
      - run: dagger call build --source .
```

**Key points**:
- `dagger/dagger-for-github@v6` action manages the Dagger engine
- Tasks are invoked via `dagger call <task> --source .`
- Exit codes propagate to the workflow (non-zero failure, zero success)
- Cache is automatically managed by the Dagger action

## Troubleshooting

### Task fails with "no such file or directory"

**Cause**: File path is incorrect in container
**Solution**: Use `/src` as the base path for mounted directory. Verify with `ls` before executing commands.

### Dagger engine startup is slow

**Cause**: First run requires downloading and initializing the engine
**Solution**: This is normal. Subsequent runs are faster. In CI, cache the engine using the `dagger-for-github` action (automatic).

### Secrets appear in output/logs

**Cause**: Manual string concatenation exposes secrets
**Solution**: Use Dagger's secret API: `dag.SetSecret(name, value)` and reference secrets without exposing them in output.

### Container build fails due to network issues

**Cause**: Image pull or dependency download timeout
**Solution**: Retry logic can be added to tasks. Consider breaking large images into smaller base images.

## References

- **Dagger Documentation**: https://docs.dagger.io/
- **Go SDK**: https://docs.dagger.io/sdk/go
- **GitHub Actions Integration**: https://docs.dagger.io/guides/dagger-for-github
- **OpenSpec Specifications**:
  - `openspec/specs/dagger-module-and-tasks/spec.md`: Core module structure
  - `openspec/specs/dagger-github-actions/spec.md`: CI/CD workflow integration
  - `openspec/changes/adopt-dagger-ci-cd/specs/dagger-module-architecture/spec.md`: Architecture decisions
  - `openspec/changes/adopt-dagger-ci-cd/specs/dagger-pipeline-usage-rules/spec.md`: Coding conventions
  - `openspec/changes/adopt-dagger-ci-cd/specs/dagger-ci-cd-platform-pattern/spec.md`: Orchestration patterns

