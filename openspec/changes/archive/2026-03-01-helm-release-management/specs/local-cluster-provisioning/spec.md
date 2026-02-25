---
td-board: helm-release-management-local-cluster-provisioning
td-issue: td-f29f71
---

# Specification: Local Cluster Provisioning (delta)

## Overview

Delta spec for the existing `local-cluster-provisioning` spec. Updates the `task dev-up` and `task dev-down` workflow to replace direct `helm install` invocations with Flux HelmRelease readiness polling, and removes `helm` from the required devbox packages for chart deployment (it may remain for chart development tooling).

## MODIFIED Requirements

### Requirement: devbox.json and Taskfile dev-up/dev-down workflow

`kind`, `kubectl`, and `flux` SHALL be available in `devbox.json`. `Taskfile.yaml` SHALL include:
- `task dev-up`: creates the kind cluster, bootstraps Flux, commits HelmRelease manifests, then waits for all Flux HelmReleases to reach `Ready=True` before declaring success
- `task dev-down`: deletes the kind cluster
- `task dev-status`: shows running pods across `staccato`, `monitoring`, and `gitea` namespaces plus Flux HelmRelease status

Direct `helm install` or `helm upgrade` commands SHALL NOT appear in `task dev-up`. The Helm CLI MAY remain in devbox.json for manual chart inspection, but it MUST NOT be used in automated setup steps.

#### Scenario: dev-up completes end-to-end via Flux

- **WHEN** `task dev-up` is run on a machine with Docker running
- **THEN** the kind cluster is created, Flux is bootstrapped, all HelmReleases (gitea, kube-prometheus-stack, loki, tempo, alloy) reach `Ready=True`, and all pods reach `Running` state within 10 minutes

#### Scenario: dev-up does not call helm install

- **WHEN** `task dev-up` completes
- **THEN** no `helm install` or `helm upgrade` command SHALL have been executed as part of the dev-up flow

#### Scenario: dev-down cleans up completely

- **WHEN** `task dev-down` is run
- **THEN** the kind cluster is deleted and `kind get clusters` no longer lists `staccato-dev`

#### Scenario: dev-status shows Flux HelmRelease state

- **WHEN** `task dev-status` is run
- **THEN** the output SHALL include `flux get helmreleases -A` output alongside pod status
