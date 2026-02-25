---
td-board: gitea-local-setup-gitea-flux-integration
td-issue: td-9c0d2b
---

# Specification: Gitea Flux Integration

## Overview

Defines how Flux v2 is wired to the Gitea instance running in the local kind cluster. Flux SHALL bootstrap from the `staccato-manifests` repository hosted on Gitea, replacing any GitHub-based source reference for local development. This closes the local GitOps loop entirely within the kind cluster.

## ADDED Requirements

### Requirement: GitRepository source for staccato-manifests in Gitea

A Flux `GitRepository` custom resource SHALL be configured to point at `http://gitea-http.gitea.svc.cluster.local:3000/gitea-admin/staccato-manifests`. The `GitRepository` SHALL use HTTP (not SSH) for cluster-internal access. It SHALL reference a Kubernetes `Secret` in the `flux-system` namespace containing the Gitea admin credentials. The reconcile interval SHALL be `1m`. The ref SHALL track the `main` branch.

#### Scenario: GitRepository resolves the Gitea-hosted staccato-manifests

- **WHEN** the `GitRepository` resource is applied to the cluster
- **THEN** `flux get source git staccato-manifests -n flux-system` shows `True` in the `READY` column within 2 minutes

#### Scenario: GitRepository reconciles on new commits to Gitea

- **WHEN** a commit is pushed to `staccato-manifests` in Gitea
- **THEN** Flux reconciles the `GitRepository` within the 1-minute interval and updates the artifact revision

### Requirement: Flux bootstrap Kustomization from Gitea

A Flux `Kustomization` resource named `flux-system` SHALL be configured to reconcile from the Gitea-hosted `GitRepository` at the path `./clusters/local`. It SHALL have `prune: true` and a reconcile interval of `5m`. It SHALL depend on the `GitRepository` source being ready.

#### Scenario: Kustomization reconciles from Gitea source

- **WHEN** the Gitea `GitRepository` is ready and `./clusters/local` exists in `staccato-manifests`
- **THEN** `flux get kustomization flux-system -n flux-system` shows `True` in the `READY` column

#### Scenario: Kustomization prunes removed resources

- **WHEN** a manifest is removed from `./clusters/local` in `staccato-manifests` and pushed to Gitea
- **THEN** Flux deletes the corresponding Kubernetes resource from the cluster within 5 minutes

### Requirement: Gitea credentials secret for Flux

A Kubernetes `Secret` named `gitea-credentials` SHALL exist in the `flux-system` namespace, containing the Gitea admin username and password (or a personal access token). This secret SHALL be created as part of the `task gitea-init` automation, not committed to the repository. The `GitRepository` SHALL reference this secret via `spec.secretRef.name`.

#### Scenario: Flux can authenticate to Gitea using the secret

- **WHEN** the `gitea-credentials` secret exists in `flux-system` and the `GitRepository` references it
- **THEN** the `GitRepository` transitions to `Ready=True` without authentication errors

#### Scenario: Credentials secret is not committed to git

- **WHEN** `git status` is checked after running `task gitea-init`
- **THEN** no secret YAML containing plaintext credentials appears as a tracked file

### Requirement: Gitea HelmRepository source for gitea-charts

A Flux `HelmRepository` resource SHALL be configured for `gitea-charts` pointing at `https://dl.gitea.com/charts/`. This allows Gitea itself to be managed as a `HelmRelease` by Flux in future iterations. The `HelmRepository` SHALL exist in the `flux-system` namespace with a reconcile interval of `1h`.

#### Scenario: HelmRepository for gitea-charts resolves

- **WHEN** the `HelmRepository` resource is applied
- **THEN** `flux get source helm gitea-charts -n flux-system` shows `True` in the `READY` column

#### Scenario: Gitea chart versions are discoverable via Flux

- **WHEN** the `HelmRepository` is ready
- **THEN** `flux get source helm gitea-charts -n flux-system` shows the chart index revision is populated
