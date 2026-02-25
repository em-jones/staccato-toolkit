---
td-board: gitea-local-setup-gitea-deployment
td-issue: td-5af2f7
---

# Specification: Gitea Deployment

## Overview

Defines how Gitea is deployed into the local kind cluster (`staccato-dev`) via Helm. Gitea runs in the `gitea` namespace and is managed declaratively through a values file. This is the foundation for the local GitOps loop.

## ADDED Requirements

### Requirement: Gitea Helm chart repository and namespace

The `gitea-charts` Helm repository SHALL be added to the local Helm configuration. A `gitea` namespace SHALL be created in the kind cluster before installation. The Helm release name SHALL be `gitea` installed into the `gitea` namespace from `gitea-charts/gitea`.

#### Scenario: Helm repo added and namespace exists

- **WHEN** `helm repo add gitea-charts https://dl.gitea.com/charts/` is run and `kubectl create namespace gitea` is executed
- **THEN** `helm repo list` shows `gitea-charts` and `kubectl get namespace gitea` returns `Active`

#### Scenario: Gitea installs successfully

- **WHEN** `helm install gitea gitea-charts/gitea -n gitea -f src/ops/dev/gitea/values.yaml` is run
- **THEN** all Gitea pods reach `Running` state within 3 minutes and `helm status gitea -n gitea` shows `deployed`

### Requirement: Gitea values.yaml declarative configuration

A values file SHALL exist at `src/ops/dev/gitea/values.yaml`. It MUST configure: a single-replica deployment, SQLite as the database backend (no external database required for local dev), disabled Kubernetes ingress (access via NodePort or port-forward), an admin account, and resource limits appropriate for local development. No ad-hoc `--set` flags SHALL be used for installation; all configuration MUST be in the values file.

#### Scenario: Values file is the single source of truth

- **WHEN** `helm install gitea gitea-charts/gitea -n gitea -f src/ops/dev/gitea/values.yaml` is run without any `--set` flags
- **THEN** Gitea is fully configured with admin credentials and service exposure as declared in the values file

#### Scenario: Values file enables reproducible reinstall

- **WHEN** the Gitea Helm release is deleted and reinstalled using only the values file
- **THEN** Gitea returns to its configured state with no manual intervention required

### Requirement: Gitea Helm release lifecycle management

The `task dev-up` Taskfile task SHALL include Gitea installation as part of the cluster setup sequence. If Gitea is already installed, `helm upgrade` SHALL be used instead of `helm install`. The `task dev-down` task SHALL delete the Gitea Helm release and the `gitea` namespace.

#### Scenario: dev-up installs or upgrades Gitea

- **WHEN** `task dev-up` is run
- **THEN** Gitea is installed if not present, or upgraded if already deployed, and reaches `Running` state

#### Scenario: dev-down removes Gitea completely

- **WHEN** `task dev-down` is run
- **THEN** the `gitea` Helm release is deleted and the `gitea` namespace is removed from the cluster

### Requirement: Gitea access via NodePort and port-forward

The Gitea HTTP service SHALL be exposed via a Kubernetes `NodePort` service on the kind cluster, mapped to a stable local port (e.g., `30300` → `3000`). Alternatively, access via `kubectl port-forward svc/gitea-http -n gitea 3000:3000` SHALL work. The Gitea UI SHALL be reachable at `http://localhost:3000` (via port-forward) or `http://localhost:30300` (via NodePort).

#### Scenario: Gitea UI reachable via port-forward

- **WHEN** `kubectl port-forward svc/gitea-http 3000:3000 -n gitea` is running
- **THEN** `curl -s http://localhost:3000` returns an HTTP 200 response with Gitea HTML content

#### Scenario: Gitea UI reachable via NodePort

- **WHEN** the kind cluster has a NodePort mapping for port `30300` and Gitea is running
- **THEN** `curl -s http://localhost:30300` returns an HTTP 200 response with Gitea HTML content
