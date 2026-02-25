---
td-board: containerize-deployable-artifacts-cli-containerization
td-issue: td-4bcc6c
---

# Specification: Staccato CLI Containerization

## Overview

This specification defines the container image requirements for the Staccato CLI tool. The CLI is a Go-based application that is distributed as a standalone binary tool. Both production and development container images must support CLI invocation with appropriate command-line argument passing and volume mounting for input/output files.

## ADDED Requirements

### Requirement: Production Containerfile for Staccato CLI

The system SHALL provide a multi-stage production Containerfile that builds an optimized, minimal runtime image for the Staccato CLI. The image MUST use a lightweight distroless or minimal base image, compile the Go binary in a build stage, and result in a container that can execute the CLI tool with passed arguments.

#### Scenario: Production image builds successfully

- **WHEN** the production Containerfile is built with `docker build -f Containerfile.prod`
- **THEN** the build completes without errors and produces a runnable image

#### Scenario: Production container executes CLI commands

- **WHEN** the production container is invoked with arguments like `docker run image command-name --flags`
- **THEN** the CLI tool executes correctly and returns appropriate output or exit code

#### Scenario: Production image is minimal and secure

- **WHEN** the production Containerfile is analyzed
- **THEN** it uses a distroless or minimal base image to reduce attack surface and image size

### Requirement: Development Containerfile for Staccato CLI

The system SHALL provide a development Containerfile that enables rapid iteration during CLI development. The development image MUST mount the local source directory as a volume, support live rebuilding of the binary, and allow for interactive testing and debugging of CLI changes.

#### Scenario: Development container supports source volume mounting

- **WHEN** the development Containerfile is built and run with mounted source directory
- **THEN** the container can access source code and rebuild the binary without image rebuild

#### Scenario: Development container enables interactive CLI testing

- **WHEN** the development container is started with an interactive terminal and source mounted
- **THEN** CLI commands can be invoked and tested with immediate feedback from code changes

#### Scenario: Development build artifacts are generated locally

- **WHEN** the development container executes build steps
- **THEN** compiled binaries are available in mounted volumes for local access and testing

### Requirement: Go compilation and build process

The system SHALL use appropriate Go build tooling within the container. The Containerfile MUST specify Go 1.23 as the minimum version (per existing Dockerfile), execute `go mod download` for dependencies, and use `go build` with appropriate flags for optimization (CGO_ENABLED=0 for static binary, GOOS=linux for cross-compilation).

#### Scenario: Go binary is statically compiled

- **WHEN** the CLI Containerfile compiles the Go source
- **THEN** the binary is compiled with CGO_ENABLED=0 to produce a static, dependency-free executable

#### Scenario: Build process downloads dependencies correctly

- **WHEN** the production Containerfile builds
- **THEN** it runs `go mod download` to populate the module cache before compilation

#### Scenario: Build optimization flags are applied

- **WHEN** the production binary is compiled
- **THEN** it uses `-ldflags="-w -s"` to strip debug symbols and reduce binary size

### Requirement: Container entrypoint and argument passing

The system SHALL properly configure the container to accept and forward command-line arguments to the CLI tool. The ENTRYPOINT or CMD SHALL allow flexible invocation with custom arguments while maintaining the expected CLI behavior.

#### Scenario: Container passes arguments to CLI binary

- **WHEN** the container is invoked with `docker run image arg1 arg2`
- **THEN** arguments are passed to the CLI binary and processed correctly

#### Scenario: Container honors working directory for file operations

- **WHEN** the container is run with mounted volumes containing input files
- **THEN** the CLI can read from and write to mounted directories

