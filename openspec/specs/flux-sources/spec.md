---
td-board: flux-usage-rules-sources
td-issue: td-6a4dd5
---

# Specification: Flux Sources (GitRepository & HelmRepository)

## Overview

Defines rules for authoring and operating Flux v2 source CRDs. Sources are the origin of truth from which Flux reads manifests and charts. All sources MUST be declared in the `staccato-manifests` repository, never in application repos.

## ADDED Requirements

### Requirement: GitRepository naming and URL conventions

The platform SHALL name `GitRepository` resources using the pattern `<repo-name>` (kebab-case), scoped to the `flux-system` namespace for cluster-wide sources. The URL MUST point to the Gitea-hosted mirror in local environments and the GitHub remote in production. Engineers SHALL NOT use raw GitHub URLs in local cluster manifests.

#### Scenario: Local environment source URL

- **WHEN** a `GitRepository` is declared for the local kind cluster
- **THEN** the `spec.url` MUST reference the internal Gitea service (e.g., `http://gitea.gitea.svc.cluster.local/<org>/<repo>.git`)

#### Scenario: Production environment source URL

- **WHEN** a `GitRepository` is declared for the production cluster
- **THEN** the `spec.url` MUST reference the GitHub remote (e.g., `https://github.com/<org>/<repo>.git`)

#### Scenario: Namespace scoping

- **WHEN** a `GitRepository` serves as the cluster-wide manifests source
- **THEN** it SHALL be placed in the `flux-system` namespace

### Requirement: GitRepository ref pinning

Sources SHALL pin to a specific branch, tag, or commit SHA via `spec.ref`. Floating refs (e.g., bare `branch: main` without a revision policy) are permitted for development environments but MUST NOT be used in production without a `semver` tag range or pinned SHA.

#### Scenario: Development branch ref

- **WHEN** a `GitRepository` targets a development environment
- **THEN** `spec.ref.branch` MAY be set to `main` or a feature branch name

#### Scenario: Production ref pinning

- **WHEN** a `GitRepository` targets a production cluster
- **THEN** `spec.ref` MUST use `tag` with a semver pattern or `commit` with a full SHA

#### Scenario: Reconcile interval for sources

- **WHEN** a `GitRepository` is created
- **THEN** `spec.interval` MUST be set to `1m` for development and `5m` for production

### Requirement: GitRepository secret references for Gitea vs GitHub

`GitRepository` resources pointing to private repos SHALL reference a `secretRef` of type `kubernetes.io/basic-auth` for Gitea (username/password) and `kubernetes.io/ssh-auth` or `github-app` for GitHub. Secrets MUST be managed via Flux's `Secret` or an external secrets operator — they SHALL NOT be committed to any repo.

#### Scenario: Gitea authentication

- **WHEN** the `GitRepository` URL is an internal Gitea instance
- **THEN** `spec.secretRef.name` MUST reference a `basic-auth` Secret in the same namespace

#### Scenario: GitHub authentication

- **WHEN** the `GitRepository` URL is a GitHub HTTPS remote
- **THEN** `spec.secretRef.name` MUST reference a Secret containing a GitHub PAT or deploy key

#### Scenario: No hardcoded credentials

- **WHEN** any source is created
- **THEN** credentials MUST NOT appear in the manifest YAML; they SHALL be injected via Secret reference only

### Requirement: HelmRepository source configuration

`HelmRepository` resources SHALL specify `spec.type` (either `default` for OCI or omitted for HTTP index). OCI registries MUST set `spec.type: oci` and reference the registry URL directly. HTTP Helm repositories MUST set `spec.url` to the chart repository index URL and include a `spec.interval` of `10m`.

#### Scenario: OCI HelmRepository

- **WHEN** a chart is sourced from an OCI registry (e.g., `oci://ghcr.io/grafana/helm-charts`)
- **THEN** `spec.type` SHALL be `oci` and the URL SHALL use the `oci://` scheme

#### Scenario: HTTP HelmRepository

- **WHEN** a chart is sourced from a traditional HTTP chart repo (e.g., Prometheus community)
- **THEN** `spec.url` SHALL use `https://` and `spec.interval` SHALL be set to `10m`

#### Scenario: HelmRepository namespace

- **WHEN** a `HelmRepository` is declared
- **THEN** it SHALL be placed in the `flux-system` namespace unless the consuming `HelmRelease` is in the same namespace

### Requirement: No manifests in application repo

The platform SHALL enforce that no Flux source, Kustomization, HelmRelease, or other GitOps manifests reside in application code repositories. All GitOps configuration MUST live in the `staccato-manifests` repository.

#### Scenario: Manifests repo separation

- **WHEN** an engineer authors a new service deployment
- **THEN** the Kustomization and source CRDs MUST be committed to `staccato-manifests`, not to the service's own repository

#### Scenario: Application repo audit

- **WHEN** a code review is performed on an application repository
- **THEN** any Flux CRD YAML found in the repository SHALL be flagged as a policy violation
