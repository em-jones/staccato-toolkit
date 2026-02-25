---
td-board: rendered-manifests-layout-manifests-promotion-workflow
td-issue: td-04178d
---

# Specification: Manifests Promotion Workflow

## Overview

Defines the end-to-end flow by which rendered Kubernetes manifests move from an application
repository's CI pipeline into `staccato-manifests` and from there into a running cluster via Flux.
Promotion between environments is a deliberate PR-based act, never an automatic file overwrite.

## ADDED Requirements

### Requirement: CI renders and writes manifests to staccato-manifests

After a successful build of an application component, the application repository's CI pipeline
SHALL render Kubernetes manifests (via kustomize or equivalent tool) and open a pull request
targeting the appropriate `<component-name>/<env>/k8s/` path in the `staccato-manifests`
repository. The CI pipeline SHALL NOT push directly to the default branch of `staccato-manifests`.

#### Scenario: Successful render opens a PR

- **WHEN** a CI job completes a successful build of component `staccato-server` for `dev`
- **THEN** the CI job MUST open a pull request in `staccato-manifests` that updates only files
  under `staccato-server/dev/k8s/`
- **AND** the PR description MUST include the originating commit SHA and CI run URL

#### Scenario: Failed render does not open a PR

- **WHEN** the manifest rendering step exits with a non-zero code
- **THEN** the CI job MUST fail and MUST NOT open or update any PR in `staccato-manifests`

### Requirement: Promotion via PR in staccato-manifests

Promoting a component from one environment to another SHALL be performed by opening a pull request
in `staccato-manifests` that copies or replaces manifest files from
`<component-name>/<src-env>/k8s/` to `<component-name>/<dst-env>/k8s/`. No promotion workflow
SHALL bypass the pull request review process.

#### Scenario: Manual promotion PR

- **WHEN** an operator wants to promote `staccato-server` from `dev` to `staging`
- **THEN** a PR MUST be opened in `staccato-manifests` updating files under
  `staccato-server/staging/k8s/` with the contents from `staccato-server/dev/k8s/`
- **AND** the PR MUST pass repository status checks before it may be merged

#### Scenario: Application repo has no promotion mechanism

- **WHEN** a developer wants to promote a deployment
- **THEN** no tooling in the application repository SHALL perform a direct git push to the `main`
  branch of `staccato-manifests`; the action MUST go through a PR

### Requirement: Flux reads exclusively from staccato-manifests

Flux MUST be configured to sync Kubernetes resources from the `staccato-manifests` repository only.
Flux MUST NOT be configured to sync from any application repository.

#### Scenario: Flux detects merged PR and reconciles

- **WHEN** a PR merging new manifests into `staccato-manifests` is merged
- **THEN** Flux MUST reconcile the affected `<component>/<env>/k8s/` path and apply the updated
  resources to the corresponding cluster namespace within its normal reconciliation interval

#### Scenario: Application repo changes do not trigger Flux directly

- **WHEN** code is merged into an application repository without a corresponding PR in
  `staccato-manifests`
- **THEN** no Flux reconciliation MUST be triggered for any cluster environment
