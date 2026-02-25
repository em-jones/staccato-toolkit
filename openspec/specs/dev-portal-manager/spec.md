---
td-board: initialize-developer-portal-dev-portal-manager
td-issue: td-df2938
---

# Specification: dev-portal-manager

## Overview

Defines the required content and behavior of the `dev-portal-manager` skill, which guides the `platform-architect` agent in managing the software catalog, structuring documentation for Backstage plugins, and symlinking ADRs from change design files.

## ADDED Requirements

### Requirement: Catalog entity authoring guidance

The skill SHALL document how each Backstage catalog entity kind (Component, System, Domain, Group, Resource) is defined, authored as YAML, and stored under `.entities/` in the repository root.

#### Scenario: Architect authors a new Component entity

- **WHEN** the platform-architect determines a new software component must be registered in the catalog
- **THEN** the skill SHALL provide the required YAML fields for a `kind: Component` entity
- **THEN** the entity file SHALL be written to `.entities/component-<name-kebab-case>.yaml`

#### Scenario: Architect authors a new System entity

- **WHEN** the platform-architect determines a new system grouping is needed
- **THEN** the skill SHALL provide the required YAML fields for a `kind: System` entity
- **THEN** the entity file SHALL be written to `.entities/system-<name-kebab-case>.yaml`

#### Scenario: Architect references an existing entity

- **WHEN** the platform-architect references an existing entity in a design
- **THEN** the skill SHALL instruct the architect to verify the entity file exists in `.entities/` before referencing it

### Requirement: Script-based entity derivation from devbox.json

The skill SHALL specify a script convention for generating `kind: Resource` catalog entities of subtype `utility` from `devbox.json` files found in the repository.

#### Scenario: devbox.json is present in a project directory

- **WHEN** a `devbox.json` file exists at a project path
- **THEN** the derivation script SHALL parse the `packages` array and produce one `kind: Resource` YAML entity per tool listed, using `spec.type: utility`
- **THEN** the generated entity files SHALL be stored in `.entities/` under the naming convention `resource-<tool-name-kebab-case>.yaml`

#### Scenario: devbox.json packages field is empty or absent

- **WHEN** the `packages` array is empty or the field is missing
- **THEN** the derivation script SHALL produce no entity files and SHALL exit cleanly with a message indicating no resources were derived

### Requirement: Script-based entity derivation from package.json

The skill SHALL specify a script convention for generating `kind: Resource` catalog entities of subtype `node-library` from `package.json` files.

#### Scenario: package.json is present with dependencies

- **WHEN** a `package.json` file exists with a non-empty `dependencies` or `devDependencies` field
- **THEN** the derivation script SHALL produce one `kind: Resource` YAML entity per listed package, using `spec.type: node-library`
- **THEN** the generated entity files SHALL be stored in `.entities/` under the naming convention `resource-<package-name-kebab-case>.yaml`

#### Scenario: package.json has no dependencies

- **WHEN** both `dependencies` and `devDependencies` are absent or empty
- **THEN** the derivation script SHALL produce no entity files and SHALL exit cleanly

### Requirement: Backstage TechDocs documentation structure

The skill SHALL describe the required documentation structure for Backstage TechDocs integration, including the `mkdocs.yml` configuration and the `docs/` directory layout.

#### Scenario: Architect scaffolds TechDocs for a new component

- **WHEN** a new component is added to the catalog
- **THEN** the skill SHALL specify that a `mkdocs.yml` file MUST exist at the component root referencing a `docs/index.md`
- **THEN** the skill SHALL specify that the `catalog-info.yaml` for the component MUST include `backstage.io/techdocs-ref: dir:.` annotation

#### Scenario: TechDocs annotation is missing

- **WHEN** the `catalog-info.yaml` does not include the TechDocs annotation
- **THEN** the skill SHALL instruct the architect to add the annotation before registering the entity

### Requirement: Backstage ADRs plugin documentation structure

The skill SHALL describe the required directory and file naming conventions for the Backstage ADRs plugin (`@backstage-community/plugin-adr`).

#### Scenario: Architect records a new ADR

- **WHEN** an architectural decision is made for a component
- **THEN** the skill SHALL specify that ADR files MUST be placed in `docs/adrs/` relative to the component root
- **THEN** each ADR file SHALL follow the naming convention `NNNN-<title-kebab-case>.md` where `NNNN` is a zero-padded sequence number
- **THEN** the `catalog-info.yaml` MUST include `backstage.io/adr-location: docs/adrs` annotation

### Requirement: Backstage Tech Radar documentation structure

The skill SHALL describe the required format and storage location for Tech Radar data consumed by the Backstage Tech Radar plugin.

#### Scenario: Platform architect publishes a Tech Radar entry

- **WHEN** a technology adoption decision is made
- **THEN** the skill SHALL specify that the Tech Radar data file MUST be maintained at `docs/tech-radar.json` in the platform root
- **THEN** each entry SHALL include `name`, `quadrant`, `ring`, and `description` fields conforming to the Backstage Tech Radar JSON schema

### Requirement: ADR symlink convention for design.md

The skill SHALL describe how a change's `design.md` is symlinked into the relevant entity's `docs/adrs/` directory so that design decisions surface in the Backstage ADRs plugin.

#### Scenario: Change design is complete and an entity owns the change

- **WHEN** a change's `design.md` is finalized and an owning catalog entity is identified
- **THEN** the skill SHALL instruct the architect to create a symlink from `docs/adrs/<sequence>-<change-name>.md` to the change's `openspec/changes/<change-name>/design.md`
- **THEN** the symlink target MUST be a relative path resolvable from the `docs/adrs/` directory

#### Scenario: No owning entity is identified for the change

- **WHEN** no catalog entity can be identified as the owner of the change
- **THEN** the skill SHALL instruct the architect to create or identify a suitable component before creating the symlink
</content>
</invoke>