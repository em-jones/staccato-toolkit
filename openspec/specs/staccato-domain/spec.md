---
td-board: adopt-golang-monorepo-staccato-domain
td-issue: td-31bf6a
---

# Specification: Staccato Domain

## Overview

Defines the `src/staccato-toolkit/core` Go module: the core layer containing core business logic, data models, and interfaces that define the behaviour of the staccato toolkit, shared across CLI and server.

## ADDED Requirements

### Requirement: Core package and module structure - td-8cbcdc

The `src/staccato-toolkit/core` module SHALL expose a `core` package containing the core business logic, data models, and interfaces of the staccato toolkit, enabling both the CLI and server modules to import and use it as a shared dependency.

#### Scenario: Core package compiles

- **WHEN** `go build ./...` is run within `src/staccato-toolkit/core` or from the workspace root
- **THEN** the build SHALL succeed and produce no errors

#### Scenario: Core package is importable

- **WHEN** another module in the workspace imports `github.com/staccato-toolkit/core`
- **THEN** the import SHALL resolve successfully via the workspace without requiring a published module version

### Requirement: Core module go.mod configuration - td-465b14

The `src/staccato-toolkit/core` directory SHALL contain a valid `go.mod` file declaring the module path and Go version, enabling it to be referenced as an independent module and included in the workspace.

#### Scenario: Module path is declared

- **WHEN** `go.mod` in `src/staccato-toolkit/core` is read
- **THEN** it SHALL declare a module path following the pattern `github.com/staccato-toolkit/core`

#### Scenario: Go version is compatible

- **WHEN** `go.mod` in `src/staccato-toolkit/core` is read
- **THEN** the declared `go` directive SHALL match the version specified in the repo-root `go.work`
