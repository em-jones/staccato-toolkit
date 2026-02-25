---
td-board: kustomize-usage-rules-overlay-structure
td-issue: td-00eb48
---

# Specification: Kustomize Overlay Structure

## Overview

Defines the required directory layout for Kustomize-managed Kubernetes manifests in staccato-toolkit. Every first-party component MUST follow this overlay structure to ensure consistent, predictable rendering across environments.

## ADDED Requirements

### Requirement: Base directory layout - td-a83c19

A component's Kustomize root SHALL contain a `base/` subdirectory holding all environment-agnostic resource manifests and a `base/kustomization.yaml` that enumerates them via the `resources:` field.

#### Scenario: Base directory exists and has kustomization.yaml

- **WHEN** a contributor browses a component's manifest root
- **THEN** a `base/` directory SHALL be present containing at least one resource manifest and a `kustomization.yaml`

#### Scenario: Base kustomization lists all resources

- **WHEN** `base/kustomization.yaml` is read
- **THEN** every manifest file in `base/` SHALL appear under the `resources:` key

### Requirement: Environment overlay directory layout - td-f73eb5

Each deployment environment (e.g., `dev`, `staging`, `prod`) SHALL have a corresponding directory at `overlays/<env>/` containing a `kustomization.yaml` that references the base via `bases:` or `resources:` and applies environment-specific patches.

#### Scenario: Overlay exists for each target environment

- **WHEN** a deployment environment is defined for a component
- **THEN** `overlays/<env>/kustomization.yaml` SHALL exist and reference `../../base`

#### Scenario: Overlay does not duplicate base resources

- **WHEN** an overlay `kustomization.yaml` is read
- **THEN** it SHALL NOT re-list resource files already declared in `base/kustomization.yaml`; instead it SHALL reference the base directory

### Requirement: kustomization.yaml at every layer - td-7036ab

Every directory that participates in the Kustomize build graph (base and each overlay) SHALL contain a valid `kustomization.yaml`. No directory MAY contain only raw manifests without a `kustomization.yaml`.

#### Scenario: kustomization.yaml present at base

- **WHEN** `kustomize build` is run against the base
- **THEN** it SHALL succeed without an error about a missing `kustomization.yaml`

#### Scenario: kustomization.yaml present at each overlay

- **WHEN** `kustomize build overlays/<env>` is run
- **THEN** it SHALL succeed without an error about a missing `kustomization.yaml` in any referenced path

### Requirement: No Helm templating in base - td-6ca676

Kustomize base manifests SHALL NOT contain Helm Go-template syntax (`{{ }}`, `{{- }}`, `{{/* */}}`). Kustomize bases are plain YAML; templating is the responsibility of Helm, which is only used for upstream third-party charts.

#### Scenario: Base manifests are valid YAML without template markers

- **WHEN** any file under `base/` is parsed as YAML
- **THEN** parsing SHALL succeed with no Helm template tokens present

#### Scenario: Reviewer detects template syntax in base

- **WHEN** a code review detects `{{` in any `base/` manifest
- **THEN** the review SHALL be blocked until template syntax is removed
