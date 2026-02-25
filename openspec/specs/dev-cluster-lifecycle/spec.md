---
td-board: k0s-cluster-bootstrap-dev-cluster-lifecycle
td-issue: td-8d9a28
---

# Specification: Dev Cluster Lifecycle

## Overview

Updates the Taskfile `dev-up` / `dev-down` tasks and the root `devbox.json` to use k0sctl instead
of KinD, providing the same developer-facing interface with k0s as the underlying cluster tool.

## MODIFIED Requirements

### Requirement: dev-up provisions a running cluster

`task dev-up` SHALL provision a local development cluster and deploy all platform components,
completing without error on a machine with Docker and devbox installed.

The underlying cluster tool SHALL be k0sctl (replacing KinD). The kubeconfig context produced
SHALL be named `staccato-dev` to maintain compatibility with existing `kubectl` and Garden
invocations.

#### Scenario: Fresh dev-up succeeds end-to-end

- **WHEN** `task dev-up` is run on a machine with no existing staccato cluster
- **THEN** a k0s cluster is provisioned, namespaces created, Helm repos added, Garden deploys, and
  `kubectl get pods -A` shows all pods Running within 5 minutes

#### Scenario: dev-up is idempotent

- **WHEN** `task dev-up` is run a second time on an already-running cluster
- **THEN** it completes without error (k0sctl apply is idempotent; helm upgrade --install is safe)

### Requirement: dev-down tears down the cluster

`task dev-down` SHALL remove the local k0s cluster and clean up associated state.

#### Scenario: dev-down removes the cluster

- **WHEN** `task dev-down` is run on a running staccato cluster
- **THEN** the k0s cluster is deleted and `kubectl --context staccato-dev get nodes` returns an
  error (context no longer valid)

## ADDED Requirements

### Requirement: k0sctl in root devbox.json

The root `devbox.json` SHALL include `k0sctl` as a package. The `kind` package SHALL be removed
from the root devbox (it remains available via `src/staccato-toolkit/core/assets/bootstrap/devbox.json`
for CI use if needed).

#### Scenario: k0sctl is on PATH in devbox shell

- **WHEN** a developer runs `devbox shell` from the repo root
- **THEN** `k0sctl version` executes successfully

#### Scenario: kind is no longer on PATH in root devbox shell

- **WHEN** a developer runs `devbox shell` from the repo root
- **THEN** `kind version` returns command not found (kind removed from root devbox.json)
