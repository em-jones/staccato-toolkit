---
td-board: containerize-deployable-artifacts-server-containerization
td-issue: td-f8d467
---

# Specification: Staccato Server Containerization

## Overview

This specification defines the container image requirements for the Staccato Server, a long-running Go-based service that exposes an HTTP API. Both production and development container images must properly handle service startup, port exposure, graceful shutdown, and hot-reloading for development scenarios.

## ADDED Requirements

### Requirement: Production Containerfile for Staccato Server

The system SHALL provide a multi-stage production Containerfile that builds an optimized, minimal runtime image for the Staccato Server. The image MUST use a lightweight distroless or minimal base image, compile the Go binary in a build stage, expose port 8080 for the HTTP API, and properly configure the container to start the server with appropriate entrypoint configuration.

#### Scenario: Production image builds successfully

- **WHEN** the production Containerfile is built with `docker build -f Containerfile.prod`
- **THEN** the build completes without errors and produces a runnable image

#### Scenario: Production container exposes HTTP API on port 8080

- **WHEN** the production container is started
- **THEN** the server binds to port 8080 and is accessible via HTTP requests to localhost:8080

#### Scenario: Production image is minimal and secure

- **WHEN** the production Containerfile is analyzed
- **THEN** it uses a distroless or minimal base image to reduce attack surface and image size, and runs as a non-root user

#### Scenario: Production container handles signals gracefully

- **WHEN** the production container receives a shutdown signal (SIGTERM)
- **THEN** the server gracefully shuts down and closes connections cleanly

### Requirement: Development Containerfile for Staccato Server

The system SHALL provide a development Containerfile that enables rapid iteration during server development. The development image MUST mount the local source directory as a volume, support live rebuilding of the binary on code changes, allow for interactive testing and debugging of the server, and maintain the same port 8080 exposure as production for compatibility.

#### Scenario: Development container supports source volume mounting

- **WHEN** the development Containerfile is built and run with mounted source directory
- **THEN** the container can access source code and rebuild the binary without image rebuild

#### Scenario: Development server hot-reloads on code changes

- **WHEN** source files are modified in the mounted directory
- **THEN** the development container detects changes and rebuilds/restarts the server automatically

#### Scenario: Development container enables debugging

- **WHEN** the development container is started with interactive terminal
- **THEN** logs are streamed to stdout and the server can be queried for debugging

#### Scenario: Development container exposes same port as production

- **WHEN** the development container starts
- **THEN** the server listens on port 8080, maintaining API compatibility with production

### Requirement: Go compilation and build process

The system SHALL use appropriate Go build tooling within the container. The Containerfile MUST specify Go 1.23 as the minimum version (per existing Dockerfile), execute `go mod download` for dependencies, and use `go build` with appropriate flags for optimization (CGO_ENABLED=0 for static binary, GOOS=linux for cross-compilation).

#### Scenario: Go binary is statically compiled

- **WHEN** the server Containerfile compiles the Go source
- **THEN** the binary is compiled with CGO_ENABLED=0 to produce a static, dependency-free executable

#### Scenario: Build process downloads dependencies correctly

- **WHEN** the production Containerfile builds
- **THEN** it runs `go mod download` to populate the module cache before compilation

#### Scenario: Build optimization flags are applied

- **WHEN** the production binary is compiled
- **THEN** it uses `-ldflags="-w -s"` to strip debug symbols and reduce binary size

### Requirement: Container entrypoint configuration

The system SHALL properly configure the container to start the server as the main process. The ENTRYPOINT or CMD MUST specify the compiled binary path and ensure the process runs as PID 1 so it receives signals correctly and can shut down gracefully.

#### Scenario: Server starts as main container process

- **WHEN** the container is started
- **THEN** the server binary is PID 1 and receives signals (SIGTERM) directly

#### Scenario: Server logs are visible in container logs

- **WHEN** the server runs in the container
- **THEN** all log output is written to stdout/stderr and visible via `docker logs`

#### Scenario: Server initializes with environment variables

- **WHEN** the container is started with environment variables
- **THEN** the server reads configuration from environment variables and command-line flags as appropriate

