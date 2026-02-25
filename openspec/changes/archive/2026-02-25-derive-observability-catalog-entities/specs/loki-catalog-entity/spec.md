---
td-board: derive-observability-catalog-entities-loki-catalog-entity
td-issue: td-4c1165
---

# Specification: Loki Catalog Entity

## Overview

Defines Loki log aggregation system as a discoverable catalog resource in the software catalog. Loki is the primary log storage and querying system in the observability stack.

## ADDED Requirements

### Requirement: Loki catalog resource exists
The system SHALL have a catalog entity resource file at `.entities/resource-loki.yaml` that documents Loki as a log aggregation and querying system.

#### Scenario: Entity file is present and valid
- **WHEN** the software catalog is initialized
- **THEN** a YAML file with kind `Resource` exists at `.entities/resource-loki.yaml`

### Requirement: Loki metadata is complete
The Loki resource entity SHALL contain comprehensive metadata including name, title, description, lifecycle status, tags, and owner.

#### Scenario: Entity has all required fields
- **WHEN** the catalog entity is loaded
- **THEN** it contains `metadata.name`, `metadata.title`, `metadata.description`, `spec.type`, `spec.owner`, `spec.system`, and appropriate tags

### Requirement: Loki tags reflect logging scope
The entity SHALL include tags for `logging`, `observability`, `logs`, `log-aggregation`, and `loki` for discovery purposes.

#### Scenario: Entity is discoverable by logging tag
- **WHEN** a user filters the catalog by tag `logging`
- **THEN** Loki appears in the results

## REMOVED Requirements

None.
