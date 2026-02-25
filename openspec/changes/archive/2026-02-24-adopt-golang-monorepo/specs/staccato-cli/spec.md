---
td-board: adopt-golang-monorepo-staccato-cli
td-issue: td-87f416
---

# Specification: Staccato CLI

## Overview

Defines the `src/staccato-toolkit/cli` Go module: the user-facing command-line interface for the staccato toolkit, providing commands to interact with the system, trigger workflows, and manage configurations.

## ADDED Requirements

### Requirement: CLI entrypoint and command structure - td-fcca75

The `src/staccato-toolkit/cli` module SHALL provide a `main` package with an entrypoint that initialises and executes the CLI application, enabling users to invoke staccato toolkit commands from the terminal.

#### Scenario: CLI binary compiles

- **WHEN** `go build ./...` is run within `src/staccato-toolkit/cli` or from the workspace root
- **THEN** the build SHALL succeed and produce no errors

#### Scenario: CLI entrypoint is reachable

- **WHEN** the compiled binary is executed
- **THEN** it SHALL exit without a panic and SHALL display usage information or a help message

### Requirement: CLI module go.mod configuration - td-ab9c6d

The `src/staccato-toolkit/cli` directory SHALL contain a valid `go.mod` file declaring the module path and Go version, enabling it to be referenced as an independent module and included in the workspace.

#### Scenario: Module path is declared

- **WHEN** `go.mod` in `src/staccato-toolkit/cli` is read
- **THEN** it SHALL declare a module path following the pattern `github.com/staccato-toolkit/cli`

#### Scenario: Go version is compatible

- **WHEN** `go.mod` in `src/staccato-toolkit/cli` is read
- **THEN** the declared `go` directive SHALL match the version specified in the repo-root `go.work`
