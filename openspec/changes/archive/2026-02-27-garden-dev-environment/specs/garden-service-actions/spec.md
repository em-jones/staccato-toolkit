---
td-board: garden-dev-environment-garden-service-actions
td-issue: td-044b19
---

# Specification: Garden Service Actions

## Overview

Defines the Garden Build/Run/Deploy actions and container images needed to bring the TUI and Web interface modules into the dev environment. Follows the patterns established by the existing server and CLI service configurations.

## ADDED Requirements

### Requirement: TUI Containerfile.dev

A `Containerfile.dev` SHALL exist at `src/staccato-toolkit/tui/Containerfile.dev` that builds the `staccato-tui` binary using a multi-stage Go build, with the repo root as the build context so `go.work` is accessible.

#### Scenario: Image builds from repo root context

- **WHEN** the container image is built with build context set to the repo root
- **THEN** the Go workspace (`go.work`) is included and `go build ./src/staccato-toolkit/tui/` succeeds

#### Scenario: Resulting image contains tui binary

- **WHEN** the image is run
- **THEN** the `staccato-tui` binary is present and executable at `/workspace/staccato-tui`

### Requirement: TUI garden.yml Build + Run actions

A `garden.yml` SHALL exist at `src/staccato-toolkit/tui/garden.yml` defining:
- A `Build` action (`staccato-tui-image`) that builds from `Containerfile.dev` with repo-root context
- A `Run` action (`staccato-tui-health`) that executes the TUI binary as a Kubernetes Job to validate the image

The TUI is a terminal process (not a persistent server), so a `Run` action (Job) is appropriate rather than a `Deploy` action.

#### Scenario: Build action uses repo root as source path

- **WHEN** Garden processes `staccato-tui-image` build action
- **THEN** `source.path` points to `../../..` (repo root) and `spec.dockerfile` references `src/staccato-toolkit/tui/Containerfile.dev`

#### Scenario: Health-check Run action references a Kubernetes Job manifest

- **WHEN** Garden executes `staccato-tui-health`
- **THEN** it applies a Job manifest from `src/ops/dev/manifests/staccato-tui/job.yaml` with the built image injected

### Requirement: Web Containerfile.dev

A `Containerfile.dev` SHALL exist at `src/staccato-toolkit/web/Containerfile.dev` that performs a multi-stage build:
1. Stage 1: Build the WASM binary (`app.wasm`) targeting `GOOS=js GOARCH=wasm`
2. Stage 2: Build the native Go HTTP server binary
3. Final stage: Copy both artifacts into the runtime image

The container SHALL serve the app on port 8081 (to avoid conflict with the server on 8080).

#### Scenario: WASM binary built in container

- **WHEN** the container image is built
- **THEN** the WASM file `web/app.wasm` is embedded in the image alongside the server binary

#### Scenario: Server listens on port 8081

- **WHEN** the container is run
- **THEN** the HTTP server starts on port 8081 and serves the go-app PWA shell

### Requirement: Web garden.yml Build + Deploy actions

A `garden.yml` SHALL exist at `src/staccato-toolkit/web/garden.yml` defining:
- A `Build` action (`staccato-web-image`) that builds from `Containerfile.dev` with repo-root context
- A `Deploy` action (`staccato-web`) that deploys the web server to Kubernetes and port-forwards to `localhost:8081`

#### Scenario: Deploy action port-forwards to localhost:8081

- **WHEN** Garden deploys `staccato-web`
- **THEN** the web UI is accessible at `http://localhost:8081` via port-forward

#### Scenario: Deploy action uses manifests from ops directory

- **WHEN** Garden processes the `staccato-web` deploy action
- **THEN** it references manifest files at `src/ops/dev/manifests/staccato-web/`
