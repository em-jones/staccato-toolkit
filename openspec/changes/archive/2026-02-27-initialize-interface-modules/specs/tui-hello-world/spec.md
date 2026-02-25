---
td-board: initialize-interface-modules-tui-hello-world
td-issue: td-447fff
---

# Specification: TUI Hello World

## Overview

Defines the minimal working TUI application for `src/staccato-toolkit/tui` using Bubble Tea v2 (`charm.land/bubbletea/v2`). Establishes the Elm Architecture pattern (Model/Init/Update/View) as the foundation for all future TUI feature development, and resolves the slog/stdout conflict that arises when a TUI application owns the terminal.

## ADDED Requirements

### Requirement: Bubble Tea v2 dependency and go.mod update - td-4df2bb

The `src/staccato-toolkit/tui/go.mod` SHALL declare a dependency on `charm.land/bubbletea/v2` at v2.0.0 or later, enabling TUI application development using the Elm Architecture.

#### Scenario: Dependency declared in go.mod

- **WHEN** `go.mod` in `src/staccato-toolkit/tui` is read
- **THEN** it SHALL contain a `require` entry for `charm.land/bubbletea/v2`

#### Scenario: Module resolves in workspace

- **WHEN** `go mod tidy` is run from `src/staccato-toolkit/tui`
- **THEN** it SHALL succeed and `go.sum` SHALL contain hashes for `charm.land/bubbletea/v2`

### Requirement: TUI hello-world Model/Init/Update/View - td-6cc71d

The `src/staccato-toolkit/tui/main.go` SHALL implement a minimal Bubble Tea v2 application using the Elm Architecture (Model struct, Init, Update, View methods) that displays "Hello, World!" and exits cleanly on `q` or `ctrl+c`.

#### Scenario: TUI displays greeting

- **WHEN** the compiled TUI binary is executed in a TTY
- **THEN** it SHALL render "Hello, World!" on screen

#### Scenario: TUI exits on q keypress

- **WHEN** the user presses `q` while the TUI is running
- **THEN** the program SHALL exit with code 0

#### Scenario: TUI exits on ctrl+c

- **WHEN** the user presses `ctrl+c` while the TUI is running
- **THEN** the program SHALL exit cleanly

#### Scenario: Model implements tea.Model interface

- **WHEN** `go build ./...` is run in `src/staccato-toolkit/tui`
- **THEN** it SHALL compile without errors, confirming the Model satisfies `tea.Model`

### Requirement: slog stdout redirect for TUI mode - td-5f7514

Before the Bubble Tea program starts, the slog default handler's output writer SHALL be redirected away from stdout to prevent slog JSON output from corrupting the TUI rendering. The OTLP gRPC log export path (via `otelslog` bridge) is unaffected by this change.

#### Scenario: slog does not write to stdout during TUI render

- **WHEN** the TUI is running and slog emits a log entry
- **THEN** the log entry SHALL NOT appear interleaved with the TUI render on stdout

#### Scenario: OTLP log export path is unaffected

- **WHEN** `OTEL_SDK_DISABLED=false` and an OTLP endpoint is configured
- **THEN** structured logs SHALL still be exported via the OTLP gRPC bridge regardless of the stdout redirect

### Requirement: TUI binary compiles and runs - td-2cf534

The `src/staccato-toolkit/tui` module SHALL build successfully from the workspace root and the resulting binary SHALL start the TUI without panicking.

#### Scenario: Build from workspace root

- **WHEN** `go build ./...` is run from the repo root (workspace mode)
- **THEN** the build SHALL succeed with no errors

#### Scenario: Binary starts without panic

- **WHEN** the compiled `tui` binary is executed
- **THEN** it SHALL not panic on startup

#### Scenario: Test suite passes

- **WHEN** `go test ./...` is run in `src/staccato-toolkit/tui`
- **THEN** all tests SHALL pass
