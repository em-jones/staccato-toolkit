---
td-board: adopt-golang-monorepo-staccato-cli
td-issue: td-87f416
---

# Specification: Staccato CLI

## Overview

Defines the `src/staccato-toolkit/cli` Go module: the user-facing command-line interface for the staccato toolkit, providing commands to interact with the system, trigger workflows, and manage configurations. Uses cobra for command-tree structure.

## Requirements

### Requirement: CLI entrypoint and command structure - td-fcca75

The `src/staccato-toolkit/cli` module SHALL provide a `main` package with an entrypoint that initialises and executes the cobra root command, enabling users to invoke staccato toolkit commands from the terminal.

#### Scenario: CLI binary compiles

- **WHEN** `go build ./...` is run within `src/staccato-toolkit/cli` or from the workspace root
- **THEN** the build SHALL succeed and produce no errors

#### Scenario: CLI entrypoint is reachable

- **WHEN** the compiled binary is executed
- **THEN** it SHALL exit without a panic and SHALL display cobra-generated usage information

#### Scenario: CLI entrypoint delegates to cobra root

- **WHEN** `main()` is called
- **THEN** it SHALL call `rootCmd.Execute()` and propagate any error to `os.Exit(1)`

### Requirement: CLI module go.mod configuration - td-ab9c6d

The `src/staccato-toolkit/cli` directory SHALL contain a valid `go.mod` file declaring the module path and Go version, enabling it to be referenced as an independent module and included in the workspace.

#### Scenario: Module path is declared

- **WHEN** `go.mod` in `src/staccato-toolkit/cli` is read
- **THEN** it SHALL declare a module path following the pattern `github.com/staccato-toolkit/cli`

#### Scenario: Go version is compatible

- **WHEN** `go.mod` in `src/staccato-toolkit/cli` is read
- **THEN** the declared `go` directive SHALL match the version specified in the repo-root `go.work`

### Requirement: cobra dependency and go.mod update - td-d98360

The `src/staccato-toolkit/cli/go.mod` SHALL declare a dependency on `github.com/spf13/cobra` at v1.8.0 or later, enabling structured CLI command-tree development.

#### Scenario: Dependency declared in go.mod

- **WHEN** `go.mod` in `src/staccato-toolkit/cli` is read
- **THEN** it SHALL contain a `require` entry for `github.com/spf13/cobra`

#### Scenario: Module resolves in workspace

- **WHEN** `go mod tidy` is run from `src/staccato-toolkit/cli`
- **THEN** it SHALL succeed and `go.sum` SHALL contain hashes for `github.com/spf13/cobra`

### Requirement: root command with hello subcommand - td-678ff1

The `src/staccato-toolkit/cli/main.go` SHALL implement a cobra root command named `staccato` with a `hello` subcommand that prints "Hello, World!" to stdout. The root command SHALL display auto-generated usage/help information when invoked without a subcommand.

#### Scenario: hello subcommand prints greeting

- **WHEN** the compiled binary is run as `staccato hello`
- **THEN** it SHALL print "Hello, World!" to stdout and exit with code 0

#### Scenario: Root command shows help

- **WHEN** the compiled binary is run as `staccato` or `staccato --help`
- **THEN** it SHALL print usage information listing available subcommands including `hello`

#### Scenario: Unknown command returns error

- **WHEN** the compiled binary is run with an unrecognised subcommand (e.g. `staccato bogus`)
- **THEN** it SHALL print an error message and exit with a non-zero exit code

### Requirement: CLI binary compiles and hello runs - td-ee14d7

The `src/staccato-toolkit/cli` module SHALL build successfully from the workspace root and the `hello` subcommand SHALL execute without panicking.

#### Scenario: Build from workspace root

- **WHEN** `go build ./...` is run from the repo root (workspace mode)
- **THEN** the build SHALL succeed with no errors

#### Scenario: Test suite passes

- **WHEN** `go test ./...` is run in `src/staccato-toolkit/cli`
- **THEN** all tests SHALL pass
