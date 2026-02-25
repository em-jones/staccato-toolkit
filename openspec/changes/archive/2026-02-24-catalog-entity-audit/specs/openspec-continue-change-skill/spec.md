---
td-board: catalog-entity-audit-openspec-continue-change-skill
td-issue: td-b0ecbd
---

# Specification: openspec-continue-change-skill

## Overview

Delta spec for `openspec/specs/openspec-continue-change-skill/spec.md`. Adds the catalog entity audit step and fixes the incorrect skill name reference in the design template comment.

## ADDED Requirements

### Requirement: Catalog entity audit runs after design-phase skill audit

After the design-phase skill audit completes in `openspec-continue-change`, the catalog entity audit (as defined in `catalog-entity-audit-step`) SHALL run automatically.

#### Scenario: Audit executes as part of design artifact creation

- **WHEN** the `openspec-continue-change` skill completes the design artifact
- **THEN** it runs the rule-coverage supplement
- **THEN** it runs the skill audit
- **THEN** it runs the catalog entity audit immediately after the skill audit
- **THEN** it shows the catalog entity audit summary before returning control

### Requirement: Design template comment references correct skill name

The design template's `## Catalog Entities` section comment SHALL reference `dev-portal-manager` as the skill to load, not `manage-software-catalog`.

#### Scenario: Agent reads design template comment

- **WHEN** an agent reads the `## Catalog Entities` comment block in the design template
- **THEN** the comment instructs them to use the `dev-portal-manager` skill
- **THEN** loading that skill name succeeds (the skill file exists at `.opencode/skills/dev-portal-manager/SKILL.md`)

## MODIFIED Requirements

(none — this spec adds new behavior only)
