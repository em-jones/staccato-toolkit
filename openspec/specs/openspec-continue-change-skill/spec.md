---
td-board: enhance-design-spec-skills-with-rules-openspec-continue-change-skill
td-issue: td-950426
---

# Specification: openspec-continue-change-skill

## Overview

Updates the `openspec-continue-change` skill to perform a rule-coverage audit during both the specs and design artifact phases. Missing rules become research tasks in td, wired as dependencies to their affected implementation tasks, so that `td next` surfaces research before implementation automatically.

## ADDED Requirements

### Requirement: Specs phase audits rule coverage against canonical patterns list - td-542ebd

During specs artifact authoring, after creating requirement tasks for a capability, the skill SHALL consult `.opencode/rules/patterns/README.md` and identify which pattern domains are relevant to the capability being specced.

#### Scenario: Capability touches a pattern domain with an existing rule

- **WHEN** the skill identifies that a capability requires `patterns/code/error-handling`
- **WHEN** `.opencode/rules/patterns/code/error-handling.md` exists
- **THEN** the skill notes the rule as covered and proceeds without creating a research task
- **THEN** the skill links the rule file to the relevant requirement tasks: `td link <task-id> .opencode/rules/patterns/code/error-handling.md --role reference`

#### Scenario: Capability touches a pattern domain with a missing rule

- **WHEN** the skill identifies that a capability requires `patterns/architecture/api-design`
- **WHEN** `.opencode/rules/patterns/architecture/api-design.md` does not exist
- **THEN** the skill creates a research task under the `td-research` feature issue
- **THEN** the research task description includes: which capabilities depend on it, the triggering design decision, the canonical README anchor, and source literature from the canonical entry

#### Scenario: Canonical patterns document is absent

- **WHEN** `.opencode/rules/patterns/README.md` does not exist
- **THEN** the skill warns the architect and skips the audit
- **THEN** the skill records a note that rule-coverage audit was skipped due to missing canonical document

### Requirement: Specs phase wires research tasks as dependencies on requirement tasks - td-e39d06

For each research task created during the specs phase audit, the skill SHALL wire `td dep add <requirement-task-id> <research-task-id>` for each requirement task in the capability that depends on that pattern domain.

#### Scenario: Research task blocks one requirement task

- **WHEN** a research task is created for `patterns/architecture/api-design`
- **WHEN** one requirement task in the capability involves API contract definition
- **THEN** `td dep add <req-task-id> <research-task-id>` is run for that task
- **THEN** `td next` will not surface the requirement task until the research task is closed

#### Scenario: Research task blocks multiple requirement tasks across capabilities

- **WHEN** a research task for `patterns/code/testing` is relevant to requirements in two different capabilities
- **THEN** the dependency is wired from each affected requirement task to the single shared research task
- **THEN** no duplicate research tasks are created for the same pattern domain

### Requirement: Specs phase creates research tasks under td-research feature - td-3ca586

Research tasks SHALL be created as children of a `td-research` feature issue that is a sibling to capability feature issues under the change root. If the `td-research` feature issue does not yet exist, the skill SHALL create it before creating the first research task.

#### Scenario: First research task in a change

- **WHEN** the specs phase identifies the first missing rule in a change
- **WHEN** no `td-research` feature issue exists yet under the change root
- **THEN** the skill creates `td create "research: <change-name>" --type feature --parent <change-root-id>`
- **THEN** the research task is created as a child of this new feature issue

#### Scenario: Subsequent research tasks in the same change

- **WHEN** a second or later missing rule is identified
- **WHEN** a `td-research` feature issue already exists
- **THEN** the new research task is created under the existing `td-research` issue
- **THEN** no duplicate `td-research` feature issues are created

### Requirement: Design phase supplements rule-coverage audit from Technology Adoption table - td-697e92

During design artifact authoring, after writing `design.md` and creating cross-cutting tasks, the skill SHALL review the `## Technology Adoption & Usage Rules` table and any explicit pattern decisions in the design, identify additional pattern domains not already covered by specs-phase research tasks, and create supplementary research tasks for any new gaps.

#### Scenario: Design introduces a new technology not covered in specs phase

- **WHEN** `design.md` Technology Adoption table lists a technology that implies a new pattern domain
- **WHEN** no research task for that pattern domain was created during the specs phase
- **THEN** the skill creates a new research task under the existing `td-research` feature issue
- **THEN** the research task is wired as a dependency to affected cross-cutting tasks from the design phase

#### Scenario: Design confirms no additional pattern gaps

- **WHEN** all pattern domains implied by design decisions already have either existing rule files or open research tasks
- **THEN** the skill notes coverage is complete and proceeds without creating additional research tasks

### Requirement: Design phase wires dependencies from cross-cutting tasks to research tasks - td-68e956

For each research task identified during the design phase audit, the skill SHALL wire `td dep add <cross-cutting-task-id> <research-task-id>` for each cross-cutting implementation task that depends on that pattern domain.

#### Scenario: Cross-cutting task depends on a missing rule

- **WHEN** a cross-cutting task from `design.md` involves implementing a CI/CD pipeline
- **WHEN** `patterns/delivery/ci-cd.md` does not exist
- **THEN** a research task is created and `td dep add <cross-cutting-task-id> <research-task-id>` is run
- **THEN** the cross-cutting task does not surface in `td next` until the research task is closed

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
