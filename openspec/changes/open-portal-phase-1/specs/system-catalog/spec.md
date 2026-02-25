---
td-board: open-portal-phase-1-system-catalog
td-issue: td-d40a82
---

# Specification: System Catalog

## Overview

Defines the entity catalog for OpenPort, supporting all 8 Backstage entity kinds. Entities are
persisted in SQLite via Drizzle ORM. `catalog-info.yaml` files can be imported from the local
filesystem or by URL. CRUD operations are exposed via TanStack Start server functions protected
by RBAC.

## ADDED Requirements

### Requirement: Eight Backstage entity kinds supported

The catalog SHALL persist entities for all 8 standard Backstage kinds: `Component`, `API`,
`Resource`, `System`, `Domain`, `User`, `Group`, and `Location`. Each kind SHALL be stored in a
shared `entities` table with a `kind` discriminator column and a `spec` JSONB column for
kind-specific fields.

#### Scenario: Component entity created and retrieved

- **WHEN** a `Component` entity is created with valid metadata and spec
- **THEN** it can be retrieved by its `kind/namespace/name` triple and all fields are preserved

#### Scenario: Unknown kind rejected

- **WHEN** an entity with `kind: "Potato"` is submitted
- **THEN** the server returns HTTP 422 with a validation error listing accepted kinds

### Requirement: catalog-info.yaml import

The `packages/catalog` package SHALL expose an `importFromYaml(source: string | URL)` function
that parses one or more entity documents from a YAML file (supporting multi-document YAML
separated by `---`) and upserts them into the database.

#### Scenario: Multi-document YAML imported successfully

- **WHEN** `importFromYaml` is called with a file containing three entity documents
- **THEN** all three entities are upserted and their `uid` fields are populated

#### Scenario: Invalid YAML rejected with error

- **WHEN** `importFromYaml` is called with malformed YAML
- **THEN** the function throws a descriptive error and no partial data is committed

### Requirement: Entity CRUD server functions

TanStack Start server functions SHALL be provided for: listing entities (with optional `kind`
filter), getting a single entity by `kind/namespace/name`, creating an entity, updating an entity,
and deleting an entity. All mutating operations SHALL require `catalog.write` permission; reads
SHALL require `catalog.read`.

#### Scenario: List entities filtered by kind

- **WHEN** a GET request is made with `?kind=Component`
- **THEN** only entities of kind `Component` are returned

#### Scenario: Delete requires write permission

- **WHEN** a `viewer`-role user attempts to delete an entity
- **THEN** the server function returns HTTP 403

### Requirement: Entity relationships stored

The catalog SHALL persist entity relationships (e.g., `ownedBy`, `partOf`, `hasPart`,
`dependsOn`, `providesApi`, `consumesApi`) in a separate `entity_relations` table linked to
entity UIDs. Relationship data SHALL be derived from the entity `spec` on upsert.

#### Scenario: Owner relationship derived on import

- **WHEN** a `Component` entity with `spec.owner: "group:default/platform-team"` is imported
- **THEN** an `ownedBy` relation is stored linking the component to the `Group` entity

### Requirement: Entity search

The catalog SHALL support full-text search over entity `metadata.name`, `metadata.title`, and
`metadata.description` fields. Search is exposed as a server function accepting a `q` query
parameter.

#### Scenario: Search returns matching entities

- **WHEN** a search query `q=payment` is submitted
- **THEN** entities whose name, title, or description contains "payment" are returned (case-insensitive)
