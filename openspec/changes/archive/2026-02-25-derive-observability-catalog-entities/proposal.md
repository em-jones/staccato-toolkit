---
td-board: derive-observability-catalog-entities
td-issue: td-15bdb8
---

# Proposal: Derive Observability Catalog Entities

## Why

Seven observability technologies (Prometheus, OpenTelemetry, Jest, Trivy, KubeLinter, distroless, Loki) have been adopted with usage rules and behavioral rules documented in OpenSpec, but lack corresponding catalog entity definitions in the software catalog. This creates a gap in the developer portal where these technologies appear in rules and decisions but have no discoverable documentation or metadata. Deriving catalog entities closes this gap and ensures the catalog comprehensively reflects all technologies in use.

## What Changes

- Create catalog entity files for 7 observability and quality technologies currently used but undocumented in the catalog
- Populate entity metadata (name, description, links, ownership, lifecycle) for each technology
- Wire catalog entities into the existing software catalog discovery system

## Capabilities

### New Capabilities

- `prometheus-catalog-entity`: Catalog entity for Prometheus monitoring system
- `opentelemetry-catalog-entity`: Catalog entity for OpenTelemetry observability framework
- `jest-catalog-entity`: Catalog entity for Jest testing framework
- `trivy-catalog-entity`: Catalog entity for Trivy container/artifact scanner
- `kubelet-catalog-entity`: Catalog entity for KubeLinter Kubernetes linter
- `distroless-catalog-entity`: Catalog entity for distroless base images
- `loki-catalog-entity`: Catalog entity for Loki log aggregation system

### Modified Capabilities

- None

## Impact

- Affected services/modules: `.entities/` directory (software catalog storage)
- API changes: No
- Data model changes: No (using existing entity schema)
- Dependencies: Existing `.entities/` entity format conventions; existing observability and delivery rules
