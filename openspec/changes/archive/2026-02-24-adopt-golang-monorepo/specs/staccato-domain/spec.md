---
td-board: adopt-golang-monorepo-staccato-domain
td-issue: td-31bf6a
---

# Specification: Staccato Domain

## Overview

Defines the `src/staccato-toolkit/domain` Go module: the domain layer containing core business logic, data models, and interfaces that define the behaviour of the staccato toolkit, shared across CLI and server.

## ADDED Requirements

### Requirement: Domain package and module structure - td-8cbcdc

The `src/staccato-toolkit/domain` module SHALL expose a `domain` package containing the core business logic, data models, and interfaces of the staccato toolkit, enabling both the CLI and server modules to import and use it as a shared dependency.

#### Scenario: Domain package compiles

- **WHEN** `go build ./...` is run within `src/staccato-toolkit/domain` or from the workspace root
- **THEN** the build SHALL succeed and produce no errors

#### Scenario: Domain package is importable

- **WHEN** another module in the workspace imports `github.com/staccato-toolkit/domain`
- **THEN** the import SHALL resolve successfully via the workspace without requiring a published module version

### Requirement: Domain module go.mod configuration - td-465b14

The `src/staccato-toolkit/domain` directory SHALL contain a valid `go.mod` file declaring the module path and Go version, enabling it to be referenced as an independent module and included in the workspace.

#### Scenario: Module path is declared

- **WHEN** `go.mod` in `src/staccato-toolkit/domain` is read
- **THEN** it SHALL declare a module path following the pattern `github.com/staccato-toolkit/domain`

#### Scenario: Go version is compatible

- **WHEN** `go.mod` in `src/staccato-toolkit/domain` is read
- **THEN** the declared `go` directive SHALL match the version specified in the repo-root `go.work`
