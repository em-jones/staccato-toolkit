---
td-board: dagger-render-task-render-task
td-issue: td-9d43df
---

# Specification: render-task

## Overview

Defines the `Render` function added to the existing `Platform` dagger module in
`src/ops/workloads/`. The function orchestrates Kustomize and `vela export` rendering for every
registered component × environment pair, then delegates to `render-pr-flow` or `render-local-flow`
to publish results to `staccato-manifests`.

## ADDED Requirements

### Requirement: Render task accepts source, env, and manifests-repo inputs

The `Render` function SHALL accept the following parameters:
- `source *Directory` — the application repository root (mounted read-only)
- `env string` — the target environment (e.g., `local`, `dev`, `staging`, `production`)
- `manifestsRepo *Directory` — a writable copy of the `staccato-manifests` repository (optional;
  may be omitted for local-only invocations)

#### Scenario: Render is invoked with explicit env flag

- **WHEN** a developer runs `dagger call render --source . --env dev`
- **THEN** the `Render` function SHALL execute with `env = "dev"` and use the source directory
  mounted from the current working directory

#### Scenario: Render is invoked without env flag

- **WHEN** a developer runs `dagger call render --source .` without specifying `--env`
- **THEN** the `Render` function SHALL default to `env = "local"` and execute the local flow

### Requirement: Render task runs kustomize build for each component

For each component registered in the module, the `Render` function SHALL execute
`kustomize build overlays/<env>` inside a container that has Kustomize installed. The output SHALL
be captured as a YAML string for each component. The render step SHALL fail immediately
(non-zero exit) if `kustomize build` exits non-zero for any component.

#### Scenario: kustomize build succeeds for all components

- **WHEN** `kustomize build overlays/<env>` exits zero for all registered components
- **THEN** the `Render` function SHALL collect all rendered YAML strings and proceed to the write
  and publish steps

#### Scenario: kustomize build fails for one component

- **WHEN** `kustomize build overlays/<env>` exits non-zero for any registered component
- **THEN** the `Render` function SHALL return an error immediately and SHALL NOT write any files to
  `staccato-manifests` or open any pull requests

### Requirement: Render task runs vela export for OAM Application manifests

If a component directory contains an `app.yaml` OAM Application manifest, the `Render` function
SHALL also execute `vela export -f src/<component>/app.yaml --env <env>` inside a container that
has the `vela` CLI installed. The output YAML SHALL be merged with the kustomize output for that
component before writing to `staccato-manifests`.

#### Scenario: Component has app.yaml — vela export runs

- **WHEN** `src/<component>/app.yaml` is present in the source tree
- **THEN** `vela export -f src/<component>/app.yaml --env <env>` SHALL be executed in the Render
  container
- **THEN** the rendered Kubernetes resources SHALL be included in the output written to
  `staccato-manifests/<component>/<env>/k8s/`

#### Scenario: Component has no app.yaml — vela export is skipped

- **WHEN** no `app.yaml` is present under `src/<component>/`
- **THEN** the `Render` function SHALL skip the `vela export` step for that component and use only
  the kustomize output

### Requirement: Render task writes YAML to staccato-manifests canonical paths

The `Render` function SHALL write all rendered YAML files to
`staccato-manifests/<component>/<env>/k8s/` following the path schema from the
`rendered-manifests-layout` spec. Each Kubernetes resource kind SHALL be written to a separate
file named by its lowercase kind (e.g., `deployment.yaml`, `service.yaml`,
`servicemonitor.yaml`). The function SHALL overwrite any previously rendered files at those paths.

#### Scenario: Rendered files are at correct canonical paths

- **WHEN** `Render` completes for component `staccato-server` in env `dev`
- **THEN** the following files SHALL exist in `staccato-manifests`:
  `staccato-server/dev/k8s/deployment.yaml`, `staccato-server/dev/k8s/service.yaml`

#### Scenario: Old rendered files are replaced on re-render

- **WHEN** `Render` runs a second time for the same component and env
- **THEN** the files at `staccato-manifests/<component>/<env>/k8s/` SHALL reflect only the latest
  render output — stale files from a previous render SHALL NOT remain

### Requirement: Render task exits non-zero if any render step fails

If any step in the `Render` pipeline exits non-zero — including `kustomize build`, `vela export`,
or file write — the entire `Render` function SHALL return an error and exit non-zero. The function
SHALL NOT partially write manifests to `staccato-manifests`.

#### Scenario: Render pipeline is atomic

- **WHEN** `vela export` exits non-zero mid-pipeline
- **THEN** the `Render` function SHALL return the error, exit non-zero, and the `staccato-manifests`
  directory SHALL NOT contain any partially written files from the failed run
