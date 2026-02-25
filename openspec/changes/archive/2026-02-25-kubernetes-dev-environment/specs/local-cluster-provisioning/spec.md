---
td-board: k8s-dev-local-cluster-provisioning
td-issue: td-bcd3c4
---

# Specification: Local Cluster Provisioning

## Overview

A `kind` (Kubernetes in Docker) cluster SHALL be the standard local development environment. Provisioning and teardown MUST be automatable via `task dev-up` and `task dev-down`.

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

`kind`, `kubectl`, and `helm` SHALL be added to `devbox.json` packages. `Taskfile.yaml` SHALL include:
- `task dev-up`: creates the kind cluster, installs namespaces, deploys observability stack and services
- `task dev-down`: deletes the kind cluster
- `task dev-status`: shows running pods across `staccato` and `monitoring` namespaces

#### Scenario: dev-up completes end-to-end

- **WHEN** `task dev-up` is run on a machine with Docker running
- **THEN** the kind cluster is created, all Helm releases are deployed, and all pods reach `Running` state within 5 minutes

#### Scenario: dev-down cleans up completely

- **WHEN** `task dev-down` is run
- **THEN** the kind cluster is deleted and `kind get clusters` no longer lists `staccato-dev`
