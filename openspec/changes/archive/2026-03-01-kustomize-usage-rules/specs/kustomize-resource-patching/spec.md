---
td-board: kustomize-usage-rules-resource-patching
td-issue: td-df9047
---

# Specification: Kustomize Resource Patching

## Overview

Defines the conventions for patching Kubernetes resources in environment overlays. Two patch mechanisms are supported: strategic merge patches for additive or field-level changes, and JSON6902 patches for precise key-level operations. All patches live in overlays, never in base.

## ADDED Requirements

### Requirement: Strategic merge patch for additive changes - td-332d19

When an overlay needs to add, replace, or remove fields in a base resource (e.g., adding environment variables, adjusting resource limits, enabling a sidecar), it SHALL use a strategic merge patch file referenced via `patchesStrategicMerge:` in the overlay `kustomization.yaml`. The patch file SHALL contain only the fields being changed alongside the identifying metadata (`apiVersion`, `kind`, `metadata.name`).

#### Scenario: Overlay adds environment variable via strategic merge patch

- **WHEN** an overlay `kustomization.yaml` lists a strategic merge patch file that adds an `env` entry to a Deployment container
- **THEN** `kustomize build` SHALL produce a Deployment that merges the new env entry with those from the base

#### Scenario: Strategic merge patch does not duplicate unchanged fields

- **WHEN** a strategic merge patch file is written
- **THEN** it SHALL include only fields being changed, not a full copy of the base resource

### Requirement: JSON6902 patch for precise key-level edits - td-45f9d9

When a change requires precise targeting of a specific array index or path (e.g., modifying a specific container by index, removing a specific label), a JSON6902 patch SHALL be used. JSON6902 patches SHALL be referenced via `patchesJson6902:` in the overlay `kustomization.yaml` and SHALL specify `target` with `group`, `version`, `kind`, and `name`.

#### Scenario: JSON6902 patch replaces a specific container image tag

- **WHEN** an overlay `kustomization.yaml` lists a JSON6902 patch targeting a Deployment with an `op: replace` on `/spec/template/spec/containers/0/image`
- **THEN** `kustomize build` SHALL produce a Deployment with the image replaced at that exact path

#### Scenario: JSON6902 patch target is fully specified

- **WHEN** a `patchesJson6902:` entry is written
- **THEN** its `target` block SHALL include `group`, `version`, `kind`, and `name` fields so the patch applies to exactly one resource

### Requirement: Patch files in overlay not base - td-852e0a

All patch files (strategic merge and JSON6902) SHALL reside within the overlay directory that applies them. No patch file SHALL be placed in `base/`. The base directory is patch-free by definition.

#### Scenario: Patch file collocated with overlay kustomization.yaml

- **WHEN** a patch file is referenced in an overlay `kustomization.yaml`
- **THEN** that patch file SHALL exist in the same `overlays/<env>/` directory or a subdirectory thereof

#### Scenario: No patch files in base directory

- **WHEN** all files under `base/` are inspected
- **THEN** no file SHALL be referenced as a patch target in any overlay; base contains only canonical resource manifests
