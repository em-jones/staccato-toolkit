---
td-board: flux-local-bootstrap-local-cluster-provisioning
td-issue: td-ad2b41
---

# Specification: Local Cluster Provisioning (Delta)

## Overview

Delta spec extending the existing `local-cluster-provisioning` specification to include Gitea setup and Flux bootstrap as required steps in the `task dev-up` workflow. After this change, a single `task dev-up` invocation produces a fully operational local GitOps environment.

## MODIFIED Requirements

### Requirement: devbox.json and Taskfile dev-up/dev-down workflow

`kind`, `kubectl`, `helm`, and `flux` SHALL be declared in `devbox.json` packages. `Taskfile.yaml` SHALL include:

- `task dev-up`: creates the kind cluster, installs namespaces, deploys observability stack and services, **runs Gitea setup (`task gitea-setup`)**, and **runs Flux bootstrap (`task flux-bootstrap`)**
- `task dev-down`: deletes the kind cluster
- `task dev-status`: shows running pods across `staccato`, `monitoring`, `gitea`, and `flux-system` namespaces
- `task gitea-setup`: deploys Gitea into the cluster and creates the `staccato-manifests` repository (idempotent)
- `task flux-bootstrap`: installs Flux controllers and bootstraps them from the Gitea-hosted `staccato-manifests` repo (idempotent)

#### Scenario: dev-up completes end-to-end with GitOps

- **WHEN** `task dev-up` is run on a machine with Docker running
- **THEN** the kind cluster is created, Gitea is deployed, the `staccato-manifests` repo is initialized, Flux is bootstrapped, all Helm releases are deployed, and all pods in `staccato`, `monitoring`, `gitea`, and `flux-system` namespaces reach `Running` state within 10 minutes

#### Scenario: dev-up is idempotent on re-run

- **WHEN** `task dev-up` is run against an already-running cluster
- **THEN** all sub-tasks (Gitea setup, Flux bootstrap) SHALL detect the existing state and skip re-installation without error

#### Scenario: dev-status includes flux-system namespace

- **WHEN** `task dev-status` is run
- **THEN** output SHALL include pod status for the `flux-system` namespace in addition to `staccato` and `monitoring`

#### Scenario: dev-down cleans up completely

- **WHEN** `task dev-down` is run
- **THEN** the kind cluster is deleted and `kind get clusters` no longer lists `staccato-dev`
