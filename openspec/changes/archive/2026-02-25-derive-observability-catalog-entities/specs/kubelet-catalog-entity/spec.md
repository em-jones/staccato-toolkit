---
td-board: derive-observability-catalog-entities-kubelet-catalog-entity
td-issue: td-ddea1c
---

# Specification: KubeLinter Catalog Entity

## Overview

Defines KubeLinter Kubernetes manifest linter as a discoverable catalog resource in the software catalog. KubeLinter is used to lint and validate Kubernetes resource definitions.

## ADDED Requirements

### Requirement: KubeLinter catalog resource exists
The system SHALL have a catalog entity resource file at `.entities/resource-kubelinter.yaml` that documents KubeLinter as a Kubernetes manifest linter.

#### Scenario: Entity file is present and valid
- **WHEN** the software catalog is initialized
- **THEN** a YAML file with kind `Resource` exists at `.entities/resource-kubelinter.yaml`

### Requirement: KubeLinter metadata is complete
The KubeLinter resource entity SHALL contain comprehensive metadata including name, title, description, lifecycle status, tags, and owner.

#### Scenario: Entity has all required fields
- **WHEN** the catalog entity is loaded
- **THEN** it contains `metadata.name`, `metadata.title`, `metadata.description`, `spec.type`, `spec.owner`, `spec.system`, and appropriate tags

### Requirement: KubeLinter tags reflect validation scope
The entity SHALL include tags for `kubernetes`, `linting`, `validation`, `k8s`, and `quality-tooling` for discovery purposes.

#### Scenario: Entity is discoverable by kubernetes tag
- **WHEN** a user filters the catalog by tag `kubernetes`
- **THEN** KubeLinter appears in the results

## REMOVED Requirements

None.
