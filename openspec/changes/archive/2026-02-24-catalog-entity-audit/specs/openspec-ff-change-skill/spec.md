---
td-board: catalog-entity-audit-openspec-ff-change-skill
td-issue: td-f5d6ad
---

# Specification: openspec-ff-change-skill

## Overview

Delta spec for `openspec/specs/openspec-ff-change-skill/spec.md`. Adds the catalog entity audit step and fixes the incorrect skill name reference in the design template.

## ADDED Requirements

### Requirement: Catalog entity audit runs after design-phase skill audit in ff-change

After the design-phase skill audit completes in `openspec-ff-change`, the catalog entity audit (as defined in `catalog-entity-audit-step`) SHALL run automatically, without pausing.

#### Scenario: Audit executes during fast-forward design artifact creation

- **WHEN** the `openspec-ff-change` skill creates the design artifact
- **THEN** after the skill audit it runs the catalog entity audit
- **THEN** if catalog tasks are created, they are added to the change board and execution continues without pausing
- **THEN** the audit summary is shown as part of the design-phase output

### Requirement: Design template comment references correct skill name in ff-change

The design template used by `openspec-ff-change` SHALL reference `dev-portal-manager` as the skill to use for catalog entity authoring.

#### Scenario: Agent reads design template comment during fast-forward authoring

- **WHEN** an agent writes the design artifact via `openspec-ff-change`
- **THEN** the template comment correctly names `dev-portal-manager`
- **THEN** if the agent needs to create catalog entities during design authoring, it can load the correct skill without searching

## MODIFIED Requirements

(none — this spec adds new behavior only)
