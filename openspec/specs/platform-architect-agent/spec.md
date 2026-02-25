---
td-board: initialize-developer-portal-platform-architect-agent
td-issue: td-206534
---

# Specification: platform-architect-agent

## Overview

Delta spec for the `platform-architect` agent. Defines the additional requirements introduced by this change: the agent MUST load and follow the `dev-portal-manager` skill during the architecture phase before making any catalog entity decisions.

## MODIFIED Requirements

### Requirement: Load dev-portal-manager skill during architecture phase

The `platform-architect` agent SHALL load the `dev-portal-manager` skill at the start of every architecture or design session, before authoring or modifying any catalog entities.

#### Scenario: Agent begins an architecture session involving catalog changes

- **WHEN** the platform-architect starts a session that will produce or modify catalog entities
- **THEN** the agent SHALL load the `dev-portal-manager` skill prior to any entity authoring
- **THEN** the agent SHALL follow the skill's guidance for entity YAML format, storage location, documentation structure, and ADR symlinking

#### Scenario: Agent begins a session with no catalog changes

- **WHEN** the platform-architect starts a session that does not involve catalog entities
- **THEN** loading `dev-portal-manager` is optional but permitted

## ADDED Requirements

### Requirement: Reference dev-portal-manager in agent definition

The `platform-architect.md` agent definition file SHALL include a dedicated section that names the `dev-portal-manager` skill and describes when to load it, consistent with the existing `development-orchestration` skill reference pattern.

#### Scenario: Agent definition is read by a new context

- **WHEN** an agent context loads `platform-architect.md`
- **THEN** the agent SHALL be able to identify the `dev-portal-manager` skill from the definition without additional instructions
- **THEN** the agent SHALL know to load the skill before catalog curation work begins
</content>
</invoke>