---
td-board: garden-dev-environment-garden-service-actions
td-issue: td-044b19
---

# Specification: Garden Service Action Configs

## Overview

Defines per-service `garden.yml` action configs for `staccato-server`, `staccato-cli`, and `backstage`. Each service declares Build, Deploy (or Run), and sync mode configuration. Actions use `patchResources` to inject Garden-managed image tags into existing Kubernetes manifests without modifying those manifest files.

## ADDED Requirements

### Requirement: staccato-server Build action with go.work-aware build context

The `staccato-server` Build action SHALL set `source.path` to the repository root and include both `src/staccato-toolkit/server/**/*` and `src/staccato-toolkit/domain/**/*` (plus `go.work` and `go.work.sum`) in its `include` list, so that a change to the `domain` module invalidates the server's version hash and the build context contains the full workspace needed for `go build` inside the container.

#### Scenario: Domain change triggers server rebuild

- **WHEN** a file in `src/staccato-toolkit/domain/` is modified
- **THEN** Garden recomputes the `staccato-server-image` version hash and rebuilds the image on the next `garden deploy`

#### Scenario: Build context includes go.work

- **WHEN** the staccato-server image is built by Garden
- **THEN** `go.work` and `go.work.sum` are present in the Docker build context so in-container `go build` resolves workspace module paths

### Requirement: staccato-server Deploy action with patchResources and sync mode

The `staccato-server` Deploy action SHALL reference the existing manifests in `src/ops/dev/manifests/staccato-server/` via `spec.manifestFiles` and use `spec.patchResources` to override the container image with Garden's built image tag and set `imagePullPolicy: IfNotPresent`. The action SHALL also patch `readOnlyRootFilesystem: false` on the container security context to enable Mutagen sync writes, and SHALL define `spec.sync.paths` that sync server and domain sources into the container and trigger `watchexec` to rebuild and restart on change.

#### Scenario: Existing manifests used without modification

- **WHEN** `garden deploy` runs
- **THEN** the files `deployment.yaml`, `service.yaml`, and `service-monitor.yaml` in `src/ops/dev/manifests/staccato-server/` are applied as-is, with only the image reference and security context patched at runtime

#### Scenario: File change triggers in-container rebuild

- **WHEN** a `.go` file in `src/staccato-toolkit/server/` is saved
- **THEN** Mutagen syncs the file into the running pod within 500ms, `watchexec` triggers `go build`, and the server restarts without pod replacement

#### Scenario: Port-forward available at localhost:8080

- **WHEN** `garden deploy --sync` is active
- **THEN** `curl http://localhost:8080/healthz` returns HTTP 200

### Requirement: staccato-cli Build and Run actions for Job workload

The `staccato-cli` SHALL have a Build action (with the same go.work-aware build context as the server) and a `kubernetes-pod` Run action that applies the existing `src/ops/dev/manifests/staccato-cli/job.yaml` with a `patchResources` override for the image tag. Sync mode SHALL NOT be configured for the CLI — it is invoked on-demand as a Job, not as a long-running Deployment.

#### Scenario: CLI image rebuilt on source change

- **WHEN** a file in `src/staccato-toolkit/cli/` is modified
- **THEN** Garden recomputes the `staccato-cli-image` version hash and rebuilds the image on the next `garden run staccato-cli-health`

#### Scenario: Job uses Garden-managed image

- **WHEN** `garden run staccato-cli-health` executes
- **THEN** the Job pod uses the image tag produced by `build.staccato-cli-image`, not the hardcoded `staccato-cli:dev` tag

### Requirement: Backstage Build action with node_modules exclusions

The `backstage` Build action SHALL include only source files (`packages/**/*`, `plugins/**/*`, `app-config*.yaml`, `tsconfig.json`, `package.json`, `yarn.lock`, `.yarnrc.yml`, `.yarn/**/*`) and SHALL exclude `node_modules/**/*` and `packages/**/dist/**/*` from both the `include` set (for version hashing) and the Docker build context. This ensures `yarn.lock` changes invalidate the version hash while large `node_modules` directories do not contribute to spurious rebuilds.

#### Scenario: yarn.lock change triggers image rebuild

- **WHEN** `yarn.lock` is updated
- **THEN** Garden recomputes the `backstage-image` version hash and rebuilds the Backstage image on the next `garden deploy`

#### Scenario: node_modules not scanned during version hash

- **WHEN** a file inside `src/dev-portal/backstage/node_modules/` changes (e.g., after `yarn install`)
- **THEN** Garden does NOT recompute the `backstage-image` version hash

### Requirement: Backstage Deploy action with source sync and HMR

The `backstage` Deploy action SHALL define `spec.sync.paths` that sync `packages/` and `plugins/` source directories (excluding `*/node_modules/**/*` and `*/dist/**/*`) and individual `app-config.yaml` / `app-config.local.yaml` files into the running pod. The sync SHALL NOT write to paths containing the container's `node_modules`. The action SHALL configure port-forwards for both port 3000 (frontend) and port 7007 (backend).

#### Scenario: TypeScript change reflected in browser

- **WHEN** a `.ts` file in `src/dev-portal/backstage/packages/app/src/` is saved
- **THEN** Mutagen syncs the file into the pod, `yarn serve` webpack HMR pushes the update to the browser, and the change is visible without a page reload within 4 seconds

#### Scenario: Container node_modules not overwritten

- **WHEN** sync mode is active and `packages/` is synced into the container
- **THEN** the container's `/workspace/packages/*/node_modules/` directories are NOT overwritten or deleted

#### Scenario: Port-forwards active for both frontend and backend

- **WHEN** `garden deploy --sync` is active
- **THEN** both `http://localhost:3000` (frontend) and `http://localhost:7007` (backend) are reachable

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
