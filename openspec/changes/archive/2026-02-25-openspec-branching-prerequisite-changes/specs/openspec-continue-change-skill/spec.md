---
td-board: openspec-branching-prerequisite-changes-openspec-continue-change-skill
td-issue: td-f80d89
---

# Specification: openspec-continue-change-skill

## Overview

Delta spec adding a prerequisite-change spawning step to `openspec-continue-change`. After the catalog entity audit completes during design artifact authoring, the skill SHALL read the `## Prerequisite Changes` table in `design.md` and spawn, gate, and announce each declared prerequisite change.

## ADDED Requirements

### Requirement: continue-change spawns prerequisite changes after design artifact catalog audit

After the catalog entity audit completes in `openspec-continue-change` (as the final step of design artifact creation), the skill SHALL read the `## Prerequisite Changes` table from `design.md` and process each non-`n/a` row.

#### Scenario: Design artifact completes with prerequisite changes declared

- **WHEN** the `openspec-continue-change` skill completes the design artifact
- **THEN** it runs the rule-coverage supplement
- **THEN** it runs the quality tooling supplement
- **THEN** it runs the skill audit
- **THEN** it runs the catalog entity audit
- **THEN** it runs the prerequisite changes step (reads table, spawns changes, creates gate tasks)
- **THEN** it shows the prerequisite changes summary before returning control

#### Scenario: Design artifact completes with no prerequisite changes declared

- **WHEN** the `## Prerequisite Changes` table contains only `n/a`
- **THEN** the skill skips the prerequisite spawning step silently
- **THEN** no gate tasks are created

