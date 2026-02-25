---
td-board: k8s-dev-local-cluster-provisioning
td-issue: td-bcd3c4
---

# Specification: Local Cluster Provisioning

## Overview

A `kind` (Kubernetes in Docker) cluster SHALL be the standard local development environment. Provisioning and teardown MUST be automatable via `task dev-up` and `task dev-down`. A single `task dev-up` invocation produces a fully operational local GitOps environment with Gitea and Flux bootstrapped.

## ADDED Requirements

### Requirement: kind cluster configuration and provisioning script

A `kind` cluster configuration file SHALL exist at `src/ops/dev/kind-config.yaml`. It MUST define: 1 control-plane node, port mappings for `80→30080` and `443→30443` (NodePort ingress), and extra mounts for local image loading. A cluster name of `staccato-dev` SHALL be used. The cluster MUST be Kubernetes ≥ 1.30.

#### Scenario: Cluster provisions successfully

- **WHEN** `kind create cluster --config src/ops/dev/kind-config.yaml --name staccato-dev` is run
- **THEN** `kubectl cluster-info --context kind-staccato-dev` returns without error within 60 seconds

#### Scenario: kubectl context is set automatically

- **WHEN** the cluster is created
- **THEN** `kubectl config current-context` equals `kind-staccato-dev`

### Requirement: devbox.json and Taskfile dev-up/dev-down workflow

`kind`, `kubectl`, and `flux` SHALL be available in `devbox.json`. The Helm CLI MAY remain in devbox.json for manual chart inspection, but it MUST NOT be used in automated setup steps. `Taskfile.yaml` SHALL include:

- `task dev-up`: creates the kind cluster, runs Gitea setup (`task gitea-setup`), runs Flux bootstrap (`task flux-bootstrap`), commits HelmRelease manifests, then waits for all Flux HelmReleases to reach `Ready=True` before declaring success
- `task dev-down`: deletes the kind cluster
- `task dev-status`: shows running pods across `staccato`, `monitoring`, `gitea`, and `flux-system` namespaces plus Flux HelmRelease status
- `task gitea-setup`: deploys Gitea into the cluster and creates the `staccato-manifests` repository (idempotent)
- `task flux-bootstrap`: installs Flux controllers and bootstraps them from the Gitea-hosted `staccato-manifests` repo (idempotent)

Direct `helm install` or `helm upgrade` commands SHALL NOT appear in `task dev-up`. The Helm CLI MAY remain in devbox.json for manual chart inspection, but it MUST NOT be used in automated setup steps.

#### Scenario: dev-up completes end-to-end via Flux with GitOps

- **WHEN** `task dev-up` is run on a machine with Docker running
- **THEN** the kind cluster is created, Gitea is deployed, the `staccato-manifests` repo is initialized, Flux is bootstrapped, all HelmReleases (gitea, kube-prometheus-stack, loki, tempo, alloy) reach `Ready=True`, and all pods in `staccato`, `monitoring`, `gitea`, and `flux-system` namespaces reach `Running` state within 10 minutes

#### Scenario: dev-up does not call helm install

- **WHEN** `task dev-up` completes
- **THEN** no `helm install` or `helm upgrade` command SHALL have been executed as part of the dev-up flow

#### Scenario: dev-up is idempotent on re-run

- **WHEN** `task dev-up` is run against an already-running cluster
- **THEN** all sub-tasks (Gitea setup, Flux bootstrap) SHALL detect the existing state and skip re-installation without error

#### Scenario: dev-down cleans up completely

- **WHEN** `task dev-down` is run
- **THEN** the kind cluster is deleted and `kind get clusters` no longer lists `staccato-dev`

#### Scenario: dev-status shows Flux HelmRelease state

- **WHEN** `task dev-status` is run
- **THEN** the output SHALL include `flux get helmreleases -A` output alongside pod status

#### Scenario: dev-status includes flux-system namespace

- **WHEN** `task dev-status` is run
- **THEN** output SHALL include pod status for the `flux-system` namespace in addition to `staccato`, `monitoring`, and `gitea`
