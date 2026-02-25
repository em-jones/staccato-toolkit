---
td-board: rendered-manifests-layout-manifests-repo-access-control
td-issue: td-757eab
---

# Specification: Manifests Repository Access Control

## Overview

Defines the RBAC and access model for the `staccato-manifests` repository. Two principals interact
with this repository: Flux (GitOps sync engine, read-only) and application CI pipelines
(write via PRs only). Human developers do not push to this repository directly.

## ADDED Requirements

### Requirement: Flux RBAC scoped read-only to staccato-manifests

Flux's service account and credentials SHALL have read-only access to the `staccato-manifests`
repository. Flux MUST NOT be granted write or admin access to `staccato-manifests` or to any
application repository.

#### Scenario: Flux reads manifests from staccato-manifests

- **WHEN** Flux reconciles a `GitRepository` source pointing to `staccato-manifests`
- **THEN** Flux MUST be able to clone or pull from the repository using read-only credentials

#### Scenario: Flux cannot write to staccato-manifests

- **WHEN** a Flux controller attempts a write operation (push, tag, branch creation) against
  `staccato-manifests`
- **THEN** the operation MUST be rejected by the repository access control layer

### Requirement: CI write access limited to staccato-manifests only

Application CI pipelines SHALL be granted write (PR creation) access to `staccato-manifests` and
MUST NOT be granted write access to any other repository as part of the manifests workflow.
CI credentials used for the manifests workflow MUST be scoped to `staccato-manifests` only.

#### Scenario: CI opens PR successfully

- **WHEN** a CI job holds a credential scoped to `staccato-manifests`
- **THEN** the CI job MUST be able to push a branch and open a pull request against
  `staccato-manifests`

#### Scenario: CI credential cannot write to application repo

- **WHEN** a CI job uses the manifests-workflow credential
- **THEN** any write operation against the application repository's remote MUST be rejected

### Requirement: No developer direct-push to staccato-manifests main

The default branch of `staccato-manifests` SHALL be protected. Direct pushes to the default branch
MUST be blocked for all identities except automated merge tooling. All changes MUST arrive via pull
request with at least one passing status check.

#### Scenario: Developer force-push blocked

- **WHEN** a developer attempts to push commits directly to the `main` branch of
  `staccato-manifests`
- **THEN** the push MUST be rejected by branch protection rules

#### Scenario: PR merge succeeds after checks pass

- **WHEN** a pull request targeting `main` in `staccato-manifests` has all required status checks
  passing
- **THEN** an authorized reviewer or automated merge bot MAY merge the PR via the standard merge
  mechanism
