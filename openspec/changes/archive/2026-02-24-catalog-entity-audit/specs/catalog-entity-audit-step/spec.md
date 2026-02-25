---
td-board: catalog-entity-audit-catalog-entity-audit-step
td-issue: td-c6b81c
---

# Specification: catalog-entity-audit-step

## Overview

Defines the catalog entity audit logic that runs after the design-phase skill audit in any OpenSpec workflow skill. This is the authoritative definition of what the audit checks, how it handles false `n/a` declarations, and what td tasks it produces.

## ADDED Requirements

### Requirement: Audit reads and validates the Catalog Entities table

After the design-phase skill audit completes, the workflow skill SHALL read the `## Catalog Entities` table from `design.md` and evaluate each row.

#### Scenario: Table has rows with action "create"

- **WHEN** a row has action `create`
- **THEN** the audit checks whether `.entities/<kind-lowercase>-<name-kebab-case>.yaml` exists
- **THEN** if the file is absent, the audit creates a td task: `td create "Catalog: create <kind> <name>" --type task --parent <change-root-id>` and links it to `design.md`
- **THEN** if the file already exists, the audit logs it as already satisfied and skips task creation

#### Scenario: Table has rows with action "existing"

- **WHEN** a row has action `existing`
- **THEN** the audit verifies the referenced entity file exists
- **THEN** if the file is absent, the audit warns: "⚠ Catalog entity declared 'existing' but file not found: `.entities/<kind-lowercase>-<name-kebab-case>.yaml`"
- **THEN** if the file exists, the audit logs it as verified

### Requirement: Audit challenges false n/a declarations

When the entire `## Catalog Entities` table is `n/a`, the audit SHALL NOT accept this silently if the change introduces new code, tools, services, or infrastructure.

#### Scenario: n/a declared but change introduces new components

- **WHEN** the Catalog Entities table contains only `n/a` rows
- **AND** the change introduces new source code directories, new CLI tools in `devbox.json`, new services, or new runtime dependencies
- **THEN** the audit warns: "⚠ Catalog Entities table is n/a but this change introduces [description]. Consider declaring catalog entities for: [suggested list]"
- **THEN** the audit creates a td task: `td create "Catalog: review entity coverage for <change-name>" --type task --parent <change-root-id>`
- **THEN** this task is not a blocker — it is a reminder that can be closed with a decision to keep `n/a` after review

#### Scenario: n/a declared and change is genuinely entity-free

- **WHEN** the Catalog Entities table contains only `n/a` rows
- **AND** the change modifies only documentation, workflow skills, or configuration with no new runtime components
- **THEN** the audit accepts the `n/a` declaration silently and logs: "✓ Catalog entity audit: n/a (change introduces no new catalog entities)"

### Requirement: Audit heuristics detect entity-worthy changes

The audit SHALL apply the following heuristics to determine whether a change is entity-worthy (i.e., warrants catalog entities despite an `n/a` declaration):

#### Scenario: New source directory under src/

- **WHEN** the change's design.md or specs reference a new directory under `src/`
- **THEN** the audit flags this as potentially requiring a Component or Resource entity

#### Scenario: New packages added to devbox.json

- **WHEN** the change adds packages to `devbox.json`
- **THEN** the audit flags each new package as potentially requiring a Resource entity (per `dev-portal-manager` derivation scripts)

#### Scenario: New GitHub Actions workflow

- **WHEN** the change adds files under `.github/workflows/`
- **THEN** the audit flags this as potentially requiring a Resource or Component entity representing the CI pipeline

#### Scenario: New agent skill

- **WHEN** the change adds files under `.opencode/skills/`
- **THEN** the audit flags this as potentially requiring documentation (TechDocs/ADR) rather than a catalog entity

### Requirement: Audit produces a summary output

After running, the catalog entity audit SHALL output a human-readable summary.

#### Scenario: Tasks created

- **WHEN** the audit creates one or more td tasks
- **THEN** it outputs:
  ```
  Catalog entity audit:
    ⚠ create .entities/component-platform.yaml → task td-xxxxx created
    ⚠ review entity coverage for <change> → task td-yyyyy created
  ```

#### Scenario: No action needed

- **WHEN** no tasks are created
- **THEN** it outputs:
  ```
  Catalog entity audit: ✓ (no action required)
  ```
