---
td-board: flux-kustomization-wiring-gitrepository-source
td-issue: td-6f0de1
---

# Specification: Flux GitRepository Source

## Overview

Defines the single shared `GitRepository` CRD placed in `staccato-manifests/flux-system/` that
acts as the cluster-wide source for all component `Kustomization` objects. This spec covers the
concrete declaration requirements: naming, URL selection per environment, ref strategy, reconcile
interval, and secret reference wiring.

## ADDED Requirements

### Requirement: Shared GitRepository declaration

The `staccato-manifests` repository SHALL contain exactly one `GitRepository` resource named
`staccato-manifests` in the `flux-system` namespace. This resource is the single source of truth
for all component `Kustomization` objects. It SHALL be stored at
`staccato-manifests/flux-system/gitrepository.yaml`.

#### Scenario: Single GitRepository exists

- **WHEN** the `flux-system` directory of `staccato-manifests` is inspected
- **THEN** exactly one `GitRepository` named `staccato-manifests` in namespace `flux-system` SHALL
  be present

#### Scenario: GitRepository name and namespace

- **WHEN** the `GitRepository` manifest is authored
- **THEN** `metadata.name` SHALL be `staccato-manifests` and `metadata.namespace` SHALL be
  `flux-system`

### Requirement: Environment-specific URL selection

The `GitRepository` `spec.url` SHALL point to the Gitea internal service URL in local
environments (`http://gitea.gitea.svc.cluster.local/<org>/staccato-manifests.git`) and to the
GitHub remote URL in production (`https://github.com/<org>/staccato-manifests.git`). Per-env
variants SHALL be managed via Kustomize overlays within `staccato-manifests/flux-system/`.

#### Scenario: Local cluster URL

- **WHEN** the `GitRepository` is applied in the local `kind` cluster
- **THEN** `spec.url` SHALL reference the in-cluster Gitea service hostname

#### Scenario: Production cluster URL

- **WHEN** the `GitRepository` is applied in a production cluster
- **THEN** `spec.url` SHALL reference the GitHub HTTPS remote

#### Scenario: Interval set correctly

- **WHEN** the `GitRepository` is declared for local development
- **THEN** `spec.interval` SHALL be `1m`; for production it SHALL be `5m`

### Requirement: Secret reference for source authentication

The `GitRepository` SHALL reference a `secretRef` to supply credentials for the private
repository. For Gitea (local), the referenced Secret SHALL be of type `kubernetes.io/basic-auth`
with `username` and `password` fields. For GitHub (production), the Secret SHALL contain a
personal access token or deploy key. Credentials MUST NOT be embedded in the manifest.

#### Scenario: Gitea secret reference

- **WHEN** the local `GitRepository` is applied
- **THEN** `spec.secretRef.name` SHALL reference a `basic-auth` Secret in `flux-system` containing
  Gitea credentials

#### Scenario: GitHub secret reference

- **WHEN** the production `GitRepository` is applied
- **THEN** `spec.secretRef.name` SHALL reference a Secret in `flux-system` containing a GitHub PAT
  or deploy key

#### Scenario: No inline credentials

- **WHEN** the `GitRepository` YAML is reviewed
- **THEN** no username, password, token, or key SHALL appear as a plain-text field in the manifest

### Requirement: Single source shared across all Kustomizations

All component `Kustomization` objects SHALL reference this single `GitRepository` via a
cross-namespace `sourceRef`. No duplicate `GitRepository` resources pointing at `staccato-manifests`
SHALL exist. Each Kustomization SHALL set `spec.sourceRef.kind: GitRepository`,
`spec.sourceRef.name: staccato-manifests`, and `spec.sourceRef.namespace: flux-system`.

#### Scenario: Cross-namespace sourceRef

- **WHEN** a component `Kustomization` is declared outside `flux-system`
- **THEN** `spec.sourceRef.namespace` SHALL be `flux-system` to reference the shared source

#### Scenario: No duplicate GitRepository

- **WHEN** the cluster is inspected for `GitRepository` resources pointing at `staccato-manifests`
- **THEN** only one such resource SHALL exist across all namespaces
