---
td-board: derive-observability-catalog-entities-distroless-catalog-entity
td-issue: td-39fb88
---

# Specification: Distroless Catalog Entity

## Overview

Defines distroless container base images as a discoverable catalog resource in the software catalog. Distroless images provide minimal base layers for containerized services, reducing attack surface and image size.

## ADDED Requirements

### Requirement: Distroless catalog resource exists
The system SHALL have a catalog entity resource file at `.entities/resource-distroless.yaml` that documents distroless as a container base image strategy.

#### Scenario: Entity file is present and valid
- **WHEN** the software catalog is initialized
- **THEN** a YAML file with kind `Resource` exists at `.entities/resource-distroless.yaml`

### Requirement: Distroless metadata is complete
The distroless resource entity SHALL contain comprehensive metadata including name, title, description, lifecycle status, tags, and owner.

#### Scenario: Entity has all required fields
- **WHEN** the catalog entity is loaded
- **THEN** it contains `metadata.name`, `metadata.title`, `metadata.description`, `spec.type`, `spec.owner`, `spec.system`, and appropriate tags

### Requirement: Distroless tags reflect container strategy
The entity SHALL include tags for `containers`, `base-images`, `security`, `minimal-images`, and `docker` for discovery purposes.

#### Scenario: Entity is discoverable by containers tag
- **WHEN** a user filters the catalog by tag `containers`
- **THEN** distroless appears in the results

## REMOVED Requirements

None.
