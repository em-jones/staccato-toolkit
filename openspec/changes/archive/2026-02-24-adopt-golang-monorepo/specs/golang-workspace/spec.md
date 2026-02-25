---
td-board: adopt-golang-monorepo-golang-workspace
td-issue: td-28aaa6
---

# Specification: Golang Workspace

## Overview

Defines the Go workspace (`go.work`) at the repo root that links all Go modules in the monorepo for unified builds, tooling, and dependency resolution.

## ADDED Requirements

### Requirement: Go workspace file at repo root - td-e4a3c5

The repository SHALL contain a `go.work` file at the root that declares the Go version and lists all Go modules in the monorepo as `use` directives, enabling workspace-aware builds and tooling across all modules.

#### Scenario: Workspace file exists and is valid

- **WHEN** a developer runs `go work sync` at the repo root
- **THEN** the command SHALL succeed without errors

#### Scenario: All modules visible to workspace tooling

- **WHEN** a developer runs `go build` targeting any module in the workspace
- **THEN** the build SHALL resolve without requiring separate `go get` or directory changes

### Requirement: Module inclusion in workspace - td-e5e171

The `go.work` file SHALL include all Go modules under `src/` as `use` directives, including `src/staccato-toolkit/cli`, `src/staccato-toolkit/server`, `src/staccato-toolkit/domain`, and `src/ops/workloads`.

#### Scenario: New module added to workspace

- **WHEN** a new Go module is created under `src/`
- **THEN** a `use` directive SHALL be added to `go.work` referencing that module's directory

#### Scenario: Workspace lists expected modules

- **WHEN** `go.work` is read
- **THEN** it SHALL contain `use` directives for all four modules: `./src/staccato-toolkit/cli`, `./src/staccato-toolkit/server`, `./src/staccato-toolkit/domain`, `./src/ops/workloads`
