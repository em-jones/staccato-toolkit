# Specification: OpenTelemetry Catalog Entity

## Overview

Defines the OpenTelemetry framework as a discoverable catalog resource in the software catalog. OpenTelemetry is the instrumentation framework used for trace, metric, and log collection across services.

## Requirements
### Requirement: OpenTelemetry catalog resource exists
The system SHALL have a catalog entity resource file at `.entities/resource-opentelemetry.yaml` that documents OpenTelemetry as an observability instrumentation framework.

#### Scenario: Entity file is present and valid
- **WHEN** the software catalog is initialized
- **THEN** a YAML file with kind `Resource` exists at `.entities/resource-opentelemetry.yaml`

### Requirement: OpenTelemetry metadata is complete
The OpenTelemetry resource entity SHALL contain comprehensive metadata including name, title, description, lifecycle status, tags, and owner.

#### Scenario: Entity has all required fields
- **WHEN** the catalog entity is loaded
- **THEN** it contains `metadata.name`, `metadata.title`, `metadata.description`, `spec.type`, `spec.owner`, `spec.system`, and appropriate tags

### Requirement: OpenTelemetry tags reflect instrumentation scope
The entity SHALL include tags for `observability`, `instrumentation`, `traces`, `metrics`, `logs`, and `tracing-framework` for discovery purposes.

#### Scenario: Entity is discoverable by instrumentation tag
- **WHEN** a user filters the catalog by tag `instrumentation`
- **THEN** OpenTelemetry appears in the results

