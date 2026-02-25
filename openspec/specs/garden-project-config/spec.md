---
td-board: garden-dev-environment-garden-project-config
td-issue: td-bebc7a
---

# Specification: Garden Project Configuration

## Overview

Defines the top-level Garden project configuration (`project.garden.yml`) that establishes environments, providers, and repository scan settings for the staccato platform. This config is the entry point for all Garden commands and must correctly target the existing kind cluster.

## ADDED Requirements

### Requirement: Garden project YAML with local and CI environments

The platform SHALL provide a `project.garden.yml` at the repository root that declares a Garden `v2` project named `staccato` with at minimum two environments: `local` (default, targets the kind cluster) and `ci` (targets a configurable remote cluster via environment variable).

#### Scenario: Local developer runs garden deploy

- **WHEN** a developer runs `garden deploy` from the repository root
- **THEN** Garden resolves the `local` environment by default and targets the `kind-staccato-dev` kubeconfig context

#### Scenario: CI runner specifies environment

- **WHEN** a CI pipeline runs `garden deploy --env ci`
- **THEN** Garden resolves the `ci` environment and reads the cluster context from `CI_KUBE_CONTEXT` environment variable

### Requirement: local-kubernetes provider targeting kind-staccato-dev

The `local` environment SHALL use the `local-kubernetes` Garden provider configured with `context: kind-staccato-dev` and `defaultNamespace: staccato` to match the existing namespace used by the application manifests.

#### Scenario: Provider resolves correct context

- **WHEN** `garden deploy` is run in the `local` environment
- **THEN** Garden uses the `kind-staccato-dev` kubeconfig context for all kubectl operations

#### Scenario: Namespace matches existing manifests

- **WHEN** Garden deploys a kubernetes-type Deploy action
- **THEN** resources are created in the `staccato` namespace, consistent with manifests in `src/ops/dev/manifests/`

### Requirement: Garden added to devbox.json

Garden (Cedar, `0.14.x`) SHALL be added to the root `devbox.json` packages list so that `garden` is available on `PATH` inside the devbox shell without requiring a separate global installation.

#### Scenario: Developer enters devbox shell

- **WHEN** a developer runs `devbox shell` from the repository root
- **THEN** `garden version` executes successfully and reports a `0.14.x` version

### Requirement: Scan exclusions for non-source directories

The project.garden.yml SHALL configure `scan.exclude` to prevent Garden from scanning large or irrelevant directories (`node_modules`, `.git`, `build`, `.devbox`, `.todos`, `.garden`, `.entities`, `.sidecar`) during version-hash computation, reducing startup latency.

#### Scenario: Garden startup is not delayed by large dirs

- **WHEN** `garden status` is run in a repository with a populated `node_modules/` at the root
- **THEN** Garden completes its scan phase without reading files inside `node_modules/`

### Requirement: Project scan discovers all 4 services

`project.garden.yml` SHALL scan the repository for `garden.yml` files and automatically discover Build/Deploy/Run actions for all four services: staccato-server, staccato-cli, staccato-tui, and staccato-web. No explicit service listing is required — Garden's file-system scan handles discovery.

#### Scenario: All services visible in garden status

- **WHEN** `garden dev` is run in the project root
- **THEN** Garden discovers and displays actions for `staccato-server`, `staccato-cli`, `staccato-tui`, and `staccato-web` (plus Backstage)

#### Scenario: New service garden.yml is auto-discovered

- **WHEN** a new `garden.yml` file is placed in any non-excluded subdirectory
- **THEN** Garden includes it in the next `garden dev` run without editing `project.garden.yml`

### Requirement: Document project.garden.yml structure

The `project.garden.yml` file SHALL include inline comments explaining the `scan.exclude` list so engineers know which paths are intentionally excluded from service discovery.

#### Scenario: Comments present in project.garden.yml

- **WHEN** a developer opens `project.garden.yml`
- **THEN** they can see which directories are excluded from scanning and why
