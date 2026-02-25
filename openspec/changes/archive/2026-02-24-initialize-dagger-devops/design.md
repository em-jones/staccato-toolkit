---
td-board: initialize-dagger-devops
td-issue: td-e468f7
status: "proposed"
date: 2026-02-24
decision-makers: [openspec agent]
---

# Design: Initialize Dagger DevOps Tooling

## Context and problem statement

The repository has no containerized, reproducible CI/CD tooling. Developer scripts rely on host-installed tools, which creates "works on my machine" friction and makes pipelines difficult to validate locally. We are introducing `dagger` to provide portable, composable pipeline execution that behaves identically on a developer laptop and in GitHub Actions.

## Decision criteria

This design achieves:

- **Reproducibility** [40%]: Pipeline steps run in containers and produce identical output regardless of host environment
- **Local-first developer experience** [35%]: Developers can run any CI step locally with a single command after `devbox shell`
- **Composability and maintainability** [25%]: Pipeline is modular — adding or removing a task is a small, isolated code change

Explicitly excludes:

- Replacing `td`, `openspec`, or other agent-facing CLIs with dagger tasks
- Multi-environment deployment automation (deferred to a future change)
- Dynamic secret injection beyond what GitHub Actions secrets provide

## Dagger Language Selection

### Option 1: Go

Go is the native language of the dagger engine. The Go SDK offers the richest API surface, strongest typing, and fastest execution due to no interpreter overhead. Cross-compilation means the module binary can be cached and reused. However, Go is not currently used in this repository and adds a new language runtime to devbox.

### Option 2: Python

Python is familiar to many developers and has an official dagger SDK. It is already present in many dev environments. However, it requires a Python interpreter, adds dependency management overhead (virtualenvs, pip), and the dagger Python SDK lags behind the Go SDK in features and performance.

### Option 3: TypeScript

TypeScript is the closest match to the existing repository stack (Node/Bun in devbox). The dagger TypeScript SDK is mature and well-maintained. It runs on the existing Node.js runtime already in devbox, adds no new language dependency, and provides strong typing via TypeScript. This maximises local-first ergonomics and minimises devbox changes.

### Decision outcome

**Go** is chosen. Go is the native language of the dagger engine, offering the richest API surface, strongest typing, and fastest execution with no interpreter overhead. The Go SDK is the most mature and feature-complete, with immediate access to new dagger capabilities. While this adds a new language runtime to devbox, the performance and API completeness advantages justify the addition. Cross-compilation means the module binary can be cached and reused efficiently in CI.

Decision logged: Go SDK selected for dagger module; native engine language provides best performance and API completeness despite adding new runtime dependency.

## Architecture

### Directory layout

```
src/
  ops/
    platform/           # dagger module root (Go SDK)
      dagger.json       # dagger module manifest
      main.go           # dagger module entry point; all task functions
      dagger.gen.go     # dagger-generated bindings (run `dagger develop` to regenerate)
      go.mod            # Go module definition
      go.sum            # Go dependency checksums
      platform_test.go  # unit tests for task logic (pure functions)
      tests/
        integration_test.go  # integration tests; requires Docker; build tag: integration
.github/
  workflows/
    ci.yml        # GitHub Actions workflow invoking dagger tasks
```

Per `patterns/architecture/repository-layout.md`: all dagger module code lives under `src/ops/platform/`. No dagger files exist outside this directory. The module is a self-contained Go module with its own `go.mod`.

### Task function design

Each CI task is a method on the dagger module struct in `main.go`. Following `patterns/code/functions.md` and `patterns/code/functional-design.md`:

- Input validation and argument construction are pure functions (testable without dagger engine)
- Container execution is invoked through the dagger client (injected at call time)
- Each task returns a structured result type with exit code and output

This separation makes unit testing tractable: tests inject a mock dagger client and assert on argument construction and result handling without running containers.

### GitHub Actions integration

The workflow uses the official `dagger-for-github` action to install and cache the dagger CLI. Each task maps to a workflow job. Job ordering uses explicit `needs:` declarations per `patterns/delivery/ci-cd.md`. Secrets are passed using dagger's secret API (`--secret name=env:SECRET_NAME`), never as plaintext.

### Devbox integration

`dagger` CLI and `go` runtime are added to `devbox.json` packages. Developers run tasks with `dagger call <task>` from within `devbox shell`. No additional setup is required.

## Risks / trade-offs

- Trade-off: Go adds a new language runtime to devbox → Mitigation: Go is widely used, well-supported in devbox, and the performance/API benefits justify the addition
- Risk: dagger engine download adds CI cold-start latency → Mitigation: GitHub Actions cache stores the dagger engine binary; cache hit eliminates download on subsequent runs
- Trade-off: dagger adds a new CLI tool to devbox; developers unfamiliar with dagger must learn its model → Mitigation: devops-automation skill provides explicit step-by-step guidance for common operations
- Risk: integration tests require Docker socket in CI → Mitigation: GitHub Actions hosted runners provide Docker; integration tests are skipped gracefully when Docker is absent (e.g., in restricted environments)

## Migration plan

1. Add `dagger` and `go` to `devbox.json` packages
2. Initialize dagger Go module under `src/ops/platform/`
3. Implement lint, test, and build task functions in Go
4. Write unit tests for task logic; write integration tests using dagger engine
5. Add `.github/workflows/ci.yml` invoking dagger tasks
6. Write `.opencode/skills/devops-automation/SKILL.md`
7. Verify: `devbox shell` → `dagger call test` passes on clean checkout; GitHub Actions CI passes on push

Rollback: remove `src/ops/platform/` directory and `.github/workflows/ci.yml`; revert `devbox.json`.

## Confirmation

How to verify this design is met:

- Test cases: `dagger call lint`, `dagger call test`, `dagger call build` each exit zero on a clean checkout from inside `devbox shell`
- Unit tests: `go test ./...` passes from `src/ops/platform/`
- Integration tests: pass with Docker available; skip gracefully without Docker
- GitHub Actions: CI workflow passes on push to default branch and on PR
- Acceptance criteria: `devops-automation` skill exists and is loadable; `devbox.json` includes dagger and go; no `td` or `openspec` references in dagger module code

## Open questions

- Should we add a `dagger call check` task that runs both lint and test as a single step? (Deferred — can be added easily once basic tasks work)
- Should dagger handle deployment to any environment? (Decided: out of scope for this change)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| ci-cd | openspec agent | patterns/delivery/ci-cd.md | reviewed |
| testing | openspec agent | patterns/code/testing.md | reviewed |
| security | openspec agent | patterns/operations/security.md | reviewed |
| repository-layout | openspec agent | patterns/architecture/repository-layout.md | reviewed |
| functional-design | openspec agent | patterns/code/functional-design.md | reviewed |
| go | openspec agent | (to be created) | new runtime |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| dagger CI/CD tooling | All developer agents | .opencode/skills/devops-automation/SKILL.md | create | New technology requiring agent guidance for adding, modifying, and running Go-based dagger tasks at `src/ops/platform/` |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | platform | create | platform-team | .entities/component-platform.yaml | validated | New Go/Dagger pipeline module at src/ops/platform/ |
| Resource | dagger | create | platform-team | .entities/resource-dagger.yaml | validated | Dagger CLI tool added to devbox.json |
| Resource | go | create | platform-team | .entities/resource-go.yaml | validated | Go runtime added to devbox.json for Dagger modules |
