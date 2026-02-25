---
td-board: gitops-tool-selection-gitops-sync-engine
td-issue: td-77c42e
---

# Specification: GitOps Sync Engine (Flux v2)

## Overview

This spec defines the requirements for adopting Flux v2 as the standard GitOps sync engine within the staccato-toolkit platform. It covers the ADR decision record, CRD usage rules, repository layout conventions, and integration constraints for Kustomize and Helm delivery paths.

## ADDED Requirements

### Requirement: Flux v2 Adoption Decision (ADR) — td-a33064

The platform SHALL formally adopt Flux v2 (CNCF Graduated) as the sole supported GitOps sync engine. The decision SHALL be captured in an Architecture Decision Record (ADR) that documents the rationale for selecting Flux v2 over ArgoCD, including decision criteria, rejected alternatives, and consequences.

#### Scenario: ADR exists and is accessible in the change spec

- **WHEN** a developer queries the ADR for GitOps engine selection
- **THEN** they SHALL find a record documenting Flux v2 as adopted, ArgoCD as rejected, and the criteria used

#### Scenario: ADR cites pull-based model as primary criterion

- **WHEN** the ADR decision criteria are reviewed
- **THEN** the pull-based reconciliation model SHALL be listed as the primary selection criterion

### Requirement: Pull-Based Sync Model — td-8d3e25

The platform SHALL enforce a pull-based reconciliation model for all GitOps-managed workloads. Controllers running in-cluster SHALL pull desired state from Git; no external push-based deployment pipelines SHALL write directly to cluster resources managed by Flux.

#### Scenario: Cluster state updated via Git commit

- **WHEN** a developer merges a change to the Git source branch
- **THEN** Flux controllers SHALL detect the change and reconcile the cluster to the new desired state without any manual trigger

#### Scenario: No external push-based writes to managed resources

- **WHEN** a resource is declared in a `Kustomization` or `HelmRelease`
- **THEN** that resource SHALL NOT be managed by an external CI push pipeline; Flux SHALL be the sole reconciler

### Requirement: GitRepository Source CRD Usage — td-c5d9ee

Platform operators SHALL declare Git source repositories using the `GitRepository` CRD from `source.toolkit.fluxcd.io`. The `GitRepository` SHALL reference a branch or tag revision and define a polling interval. Authentication SHALL use SSH deploy keys or HTTPS tokens stored as Kubernetes Secrets.

#### Scenario: GitRepository with branch tracking

- **WHEN** a `GitRepository` resource is applied to the cluster
- **THEN** the source controller SHALL poll the referenced branch on the configured interval and update the artifact on new commits

#### Scenario: GitRepository authentication via SSH deploy key

- **WHEN** the target Git repository requires authentication
- **THEN** the `GitRepository` SHALL reference a Kubernetes Secret containing the SSH private key

### Requirement: Kustomization CRD for Workload Reconciliation — td-ba719c

All Kubernetes workloads managed by Flux SHALL be declared via the `Kustomization` CRD from `kustomize.toolkit.fluxcd.io`. Each `Kustomization` SHALL reference a `GitRepository` source, define a target namespace, specify a path within the repository, and set a reconciliation interval. Health checks SHALL be enabled for Deployments and StatefulSets.

#### Scenario: Kustomization reconciles manifests from a path

- **WHEN** a `Kustomization` is applied targeting a path in a `GitRepository`
- **THEN** the kustomize-controller SHALL apply all manifests under that path to the target namespace

#### Scenario: Kustomization with health check enabled

- **WHEN** a `Kustomization` has `spec.healthChecks` configured
- **THEN** Flux SHALL report the `Kustomization` as `Ready` only when all referenced workloads reach a healthy state

### Requirement: HelmRelease CRD for Chart Delivery — td-b58c2e

Helm-based workloads SHALL be delivered via the `HelmRelease` CRD from `helm.toolkit.fluxcd.io`. Each `HelmRelease` SHALL reference a `HelmRepository` or `GitRepository` source, specify chart name and version, and declare values overrides in-line or via `ConfigMap`/`Secret` references. Direct `helm install` / `helm upgrade` invocations to Flux-managed releases are forbidden.

#### Scenario: HelmRelease installs chart from HelmRepository

- **WHEN** a `HelmRelease` references a `HelmRepository` source and a chart version
- **THEN** the helm-controller SHALL install or upgrade the chart to match the declared version and values

#### Scenario: No direct helm CLI to Flux-managed releases

- **WHEN** a Flux-managed release is in place
- **THEN** operators SHALL NOT use `helm install` or `helm upgrade` against that release; all changes SHALL be made via Git

### Requirement: Repository Layout Convention — td-005d6f

The platform SHALL adopt a canonical directory layout for Flux-managed repositories. The top-level `clusters/<cluster-name>/` directory SHALL contain cluster-specific Kustomizations and HelmReleases. The `infrastructure/` directory SHALL contain shared platform controllers and CRDs. The `apps/` directory SHALL contain application workload manifests. This layout SHALL be documented and enforced via linting in CI.

#### Scenario: Repository follows canonical layout

- **WHEN** a new cluster is onboarded to Flux
- **THEN** the repository SHALL contain `clusters/<cluster-name>/`, `infrastructure/`, and `apps/` directories in the agreed structure

#### Scenario: CI lints repository layout

- **WHEN** a pull request modifies the GitOps repository
- **THEN** a CI check SHALL validate that the canonical directory layout is preserved
