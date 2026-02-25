---
td-board: kustomize-usage-rules-image-patching
td-issue: td-4d5719
---

# Specification: Kustomize Image Patching

## Overview

Defines how container image references and tags are managed in Kustomize overlays. Image tags are environment-specific values; they SHALL be patched via the `images:` block in overlay `kustomization.yaml` files rather than being mutated directly in base manifests.

## ADDED Requirements

### Requirement: Image tag patching via images block - td-aab490

Each overlay `kustomization.yaml` SHALL use the `images:` field to override the `newTag` (or `newName`) for any container image that varies per environment. This is the only sanctioned mechanism for changing image references between environments.

#### Scenario: Overlay sets image tag for deployment

- **WHEN** an overlay `kustomization.yaml` specifies an `images:` block entry with `name`, `newName`, or `newTag`
- **THEN** `kustomize build` SHALL produce manifests with the updated image reference applied to all matching containers

#### Scenario: Image tag change is isolated to overlay

- **WHEN** `kustomize build base` is run (without an overlay)
- **THEN** the resulting manifests SHALL use the placeholder or latest-stable tag declared in the base, not an environment-specific tag

### Requirement: No direct tag mutation in base - td-7fbe65

Base manifests SHALL NOT hard-code environment-specific image tags (e.g., a specific digest or CI-built tag). Base container image references SHALL use a stable placeholder tag (e.g., `latest` or a documented sentinel such as `PLACEHOLDER`) that overlays override via the `images:` block.

#### Scenario: Base manifest uses placeholder tag

- **WHEN** a base Deployment manifest is read
- **THEN** its `image:` field SHALL reference a placeholder or release-stable tag, not a CI-generated commit-SHA tag

#### Scenario: PR merges base change with a commit-SHA tag

- **WHEN** a pull request modifies a base manifest to set a commit-SHA as the image tag
- **THEN** the PR SHALL be rejected in review with a note to use the overlay `images:` block instead

### Requirement: One image entry per container - td-2fb83c

The `images:` block in an overlay `kustomization.yaml` SHALL contain at most one entry per unique image `name`. Duplicate entries for the same image name are prohibited and will cause undefined behavior.

#### Scenario: Single entry per image in images block

- **WHEN** an overlay `kustomization.yaml` is linted
- **THEN** each value under `images[].name` SHALL appear exactly once

#### Scenario: Build fails on duplicate image entry

- **WHEN** `kustomize build` is invoked on an overlay with duplicate image names
- **THEN** the build SHALL fail or produce incorrect output, making the violation detectable in CI
