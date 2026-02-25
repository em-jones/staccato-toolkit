---
td-board: gitea-local-setup-gitea-repo-initialization
td-issue: td-ce8401
---

# Specification: Gitea Repository Initialization

## Overview

Defines the post-install initialization steps required to make Gitea operational for the local GitOps loop. This includes provisioning the Gitea admin account, creating the `staccato-manifests` repository (consumed by Flux), and creating a mirror of the `staccato-toolkit` application repository.

## ADDED Requirements

### Requirement: Gitea admin account provisioning

A Gitea admin user account SHALL be created after Gitea is deployed. The admin credentials SHALL be sourced from the `src/ops/dev/gitea/values.yaml` file (no hardcoded secrets in scripts). The admin account SHALL have the username `gitea-admin` and SHALL be the owner of all repositories created during initialization.

#### Scenario: Admin account exists after initialization

- **WHEN** the Gitea initialization task or script is run after `helm install`
- **THEN** `curl -u gitea-admin:<password> http://localhost:3000/api/v1/users/gitea-admin` returns HTTP 200 with the admin user object

#### Scenario: Admin credentials match values file

- **WHEN** Gitea is accessed with credentials from `values.yaml`
- **THEN** authentication succeeds and the API returns a valid token

### Requirement: staccato-manifests repository creation in Gitea

A repository named `staccato-manifests` SHALL be created in Gitea under the `gitea-admin` organization or user account after install. The repository SHALL be initialized with an empty default branch (`main`). This is the repository Flux will bootstrap from for the local GitOps loop.

#### Scenario: staccato-manifests repo exists in Gitea

- **WHEN** the initialization task is run
- **THEN** `curl -u gitea-admin:<password> http://localhost:3000/api/v1/repos/gitea-admin/staccato-manifests` returns HTTP 200

#### Scenario: staccato-manifests repo has a main branch

- **WHEN** the initialization task is run
- **THEN** `git clone http://gitea-admin:<password>@localhost:3000/gitea-admin/staccato-manifests` succeeds and the default branch is `main`

### Requirement: staccato-toolkit mirror repository in Gitea

A repository named `staccato-toolkit` SHALL be created in Gitea to host a local mirror of the application source. It SHALL be initialized from the local working copy of the `staccato-toolkit` repo (e.g., via `git push --mirror`). This enables Flux to reference application manifests locally without requiring GitHub access.

#### Scenario: staccato-toolkit repo exists in Gitea

- **WHEN** the initialization task is run
- **THEN** `curl -u gitea-admin:<password> http://localhost:3000/api/v1/repos/gitea-admin/staccato-toolkit` returns HTTP 200

#### Scenario: staccato-toolkit repo contains commits

- **WHEN** the mirror push completes
- **THEN** `git ls-remote http://gitea-admin:<password>@localhost:3000/gitea-admin/staccato-toolkit` lists at least one branch ref

### Requirement: Repository initialization automation

A `task gitea-init` Taskfile target SHALL automate the complete post-install repository initialization. It SHALL be idempotent — running it multiple times MUST NOT create duplicate repositories or fail if they already exist. It SHALL use the Gitea HTTP API (via `curl` or equivalent) for all operations, not the Gitea CLI.

#### Scenario: gitea-init runs idempotently

- **WHEN** `task gitea-init` is run twice in succession
- **THEN** the second run completes without error and produces no duplicate repositories

#### Scenario: gitea-init completes all initialization steps

- **WHEN** `task gitea-init` is run against a fresh Gitea install
- **THEN** both `staccato-manifests` and `staccato-toolkit` repos exist and are accessible via the Gitea API
