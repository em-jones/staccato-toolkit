---
td-board: flux-local-bootstrap-flux-bootstrap-local
td-issue: td-dee7fa
---

# Specification: Flux Bootstrap (Local)

## Overview

Defines the requirements for installing Flux v2 controllers into the local `kind` cluster and bootstrapping them to watch the `staccato-manifests` repository hosted on the in-cluster Gitea instance. After bootstrap, Flux is self-managing: the bootstrap configuration lives in `staccato-manifests` itself and Flux reconciles it on each interval.

## ADDED Requirements

### Requirement: Flux CLI devbox package

The `flux` CLI SHALL be added to `devbox.json` packages so that all developers have access to the Flux CLI within the devbox shell without manual installation.

#### Scenario: Flux CLI available in devbox shell

- **WHEN** a developer runs `devbox shell`
- **THEN** `flux version` SHALL return a version string without error

#### Scenario: Flux CLI version constraint

- **WHEN** `flux` is declared in `devbox.json`
- **THEN** the version SHALL be pinned to a specific release (e.g., `flux@2.x`) and SHALL NOT use a floating `latest` tag

### Requirement: Flux bootstrap into kind cluster via Gitea

Flux v2 controllers SHALL be installed into the `staccato-dev` kind cluster and bootstrapped from the `staccato-manifests` repository on the internal Gitea instance. The bootstrap SHALL use `flux bootstrap gitea` (or equivalent `flux install` + manifest apply) targeting the `flux-system` namespace. The Gitea credentials (username/password) SHALL be provided as a Kubernetes Secret of type `kubernetes.io/basic-auth` named `gitea-credentials` in the `flux-system` namespace, created before bootstrapping.

#### Scenario: Controllers running after bootstrap

- **WHEN** the Flux bootstrap script completes
- **THEN** `kubectl get pods -n flux-system` SHALL show `source-controller`, `kustomize-controller`, `helm-controller`, and `notification-controller` pods in `Running` state within 120 seconds

#### Scenario: GitRepository source created pointing at Gitea

- **WHEN** the Flux bootstrap completes
- **THEN** `kubectl get gitrepository -n flux-system staccato-manifests` SHALL exist and report `Ready=True` with the Gitea internal service URL (e.g., `http://gitea.gitea.svc.cluster.local/<org>/staccato-manifests.git`) as its source

#### Scenario: Gitea credentials secret injected before bootstrap

- **WHEN** the bootstrap script runs
- **THEN** a Secret named `gitea-credentials` of type `kubernetes.io/basic-auth` SHALL exist in `flux-system` before `flux bootstrap` is invoked, containing the `username` and `password` fields for the Gitea service account

#### Scenario: Bootstrap is idempotent

- **WHEN** the bootstrap script is run a second time on an already-bootstrapped cluster
- **THEN** it SHALL complete without error and leave the cluster in the same state

### Requirement: Self-managing bootstrap config committed to staccato-manifests

The Flux bootstrap configuration — specifically the `GitRepository` pointing at `staccato-manifests` and the `Kustomization` named `flux-system` — SHALL be committed to the `staccato-manifests` repository under `flux-system/local/k8s/`. This makes Flux self-managing: after the initial bootstrap apply, all future changes to the Flux configuration are reconciled by Flux itself.

#### Scenario: Bootstrap manifests present in staccato-manifests

- **WHEN** the bootstrap script completes
- **THEN** the `staccato-manifests` repository SHALL contain at minimum:
  - `flux-system/local/k8s/gotk-components.yaml` (Flux CRDs and controllers)
  - `flux-system/local/k8s/gotk-sync.yaml` (`GitRepository` + root `Kustomization`)
  - `flux-system/local/k8s/kustomization.yaml`

#### Scenario: Flux reconciles its own config

- **WHEN** the root `Kustomization` (`flux-system`) is in `Ready=True` state
- **THEN** changes pushed to `staccato-manifests/flux-system/local/k8s/` SHALL be applied to the cluster within the configured reconcile interval (1m)

### Requirement: Post-bootstrap reconcile verification

After bootstrapping, the following verification commands SHALL succeed without error:

1. `flux reconcile source git staccato-manifests`
2. `flux reconcile kustomization flux-system`

These commands SHALL be documented in the bootstrap script and in the `task dev-up` output.

#### Scenario: Source reconcile succeeds

- **WHEN** `flux reconcile source git staccato-manifests -n flux-system` is run
- **THEN** it SHALL complete with `Reconciliation finished` status and no errors within 60 seconds

#### Scenario: Kustomization reconcile succeeds

- **WHEN** `flux reconcile kustomization flux-system -n flux-system` is run
- **THEN** it SHALL complete with `Reconciliation finished` status and no errors within 60 seconds

#### Scenario: Failed reconcile surfaces actionable error

- **WHEN** a reconcile fails (e.g., Gitea unreachable, bad credentials)
- **THEN** `flux get all -A` SHALL show the failing resource with a human-readable `Message` field explaining the failure
