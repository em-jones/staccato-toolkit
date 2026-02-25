---
td-board: autonomous-openspec-skill-openspec-autonomous-skill
td-issue: td-522630
---

# Specification: openspec-autonomous-skill

## Overview

Defines the `development-orchestration` skill — an orchestrator that drives the complete OpenSpec workflow (change creation → artifact authoring → task execution → review) in a single invocation with minimal end-user intervention.

## ADDED Requirements

### Requirement: Skill accepts a change description or name as its sole input

The skill SHALL accept either a natural-language description or a kebab-case change name as input. If no input is provided, it SHALL ask the user one open-ended question to obtain a description before proceeding.

#### Scenario: Input is a natural-language description

- **WHEN** the user invokes the skill with a description (e.g., "add rate limiting to the API")
- **THEN** the skill derives a kebab-case change name from the description
- **THEN** the skill announces the derived name and proceeds without further prompting

#### Scenario: Input is already a kebab-case name

- **WHEN** the user invokes the skill with a kebab-case name (e.g., `add-rate-limiting`)
- **THEN** the skill uses the name as-is and proceeds

#### Scenario: No input provided

- **WHEN** the user invokes the skill with no argument
- **THEN** the skill asks one open-ended question: "What change do you want to work on?"
- **THEN** the skill derives a name from the response and proceeds

### Requirement: Skill announces its plan before executing

The skill SHALL display a concise execution plan at the start of each invocation, before making any changes, so the user can abort if needed.

#### Scenario: Plan is shown before any artifact is written

- **WHEN** the skill begins execution
- **THEN** it outputs the change name, schema being used, and ordered list of phases to execute
- **THEN** it proceeds with execution without waiting for confirmation (autonomous mode)

#### Scenario: Existing change is detected

- **WHEN** a change directory already exists for the derived name
- **THEN** the skill detects this and resumes from the current artifact state rather than overwriting
- **THEN** it announces "Resuming change: <name>" and shows current progress

### Requirement: Skill orchestrates artifact creation using existing sub-skill logic

The skill SHALL create all artifacts required by the schema by sequencing the logic of existing sub-skills (`openspec-new-change`, `openspec-ff-change`) without duplicating their implementation. It SHALL follow the artifact order defined by the schema and SHALL NOT skip any artifact.

#### Scenario: All artifacts created in schema order

- **WHEN** the skill runs artifact authoring for a new change
- **THEN** it creates artifacts in schema dependency order (proposal first, then any that depend on it)
- **THEN** each artifact is written to its output path as defined by `openspec instructions`
- **THEN** td issues, boards, and requirement tasks are created for each artifact per the sub-skill instructions
- **THEN** the rule-coverage audit runs after each specs capability and after design

#### Scenario: Artifact authoring requires clarification

- **WHEN** the proposal description is fewer than ~10 words or lacks a clear problem domain
- **THEN** the skill asks one targeted clarifying question before authoring the proposal
- **THEN** after receiving the answer, the skill continues without further interruption

### Requirement: Skill executes all implementation tasks after artifacts are complete

After all `applyRequires` artifacts are created, the skill SHALL execute all open implementation tasks on the change board using the logic of `openspec-execute`, implementing and reviewing each task in sequence.

#### Scenario: Implementation loop runs to completion

- **WHEN** all required artifacts are complete
- **THEN** the skill loads the change board from `proposal.md` frontmatter
- **THEN** it works through each open task: `td start` → implement → `td handoff` → `td review`
- **THEN** after all tasks are submitted, it enters reviewer mode and approves or rejects each
- **THEN** the loop repeats until all tasks on the board are closed

#### Scenario: Blocker encountered during implementation

- **WHEN** an implementation task reveals a genuine blocker (missing context, external dependency, design conflict)
- **THEN** the skill logs the blocker with `td log --blocker "<reason>"`
- **THEN** the skill surfaces the blocker to the user and pauses, awaiting guidance
- **THEN** once guidance is received, execution resumes from the blocked task

### Requirement: Skill pauses only for genuine blockers, not routine decisions

The skill SHALL make reasonable autonomous decisions for all routine choices encountered during artifact authoring and implementation. It SHALL pause and prompt the user ONLY when: (a) the input is genuinely ambiguous, (b) a hard technical blocker is encountered, or (c) an external approval or credential is required.

#### Scenario: Routine architectural decision during design

- **WHEN** the skill must choose between two implementation approaches with similar trade-offs
- **THEN** it selects the approach most consistent with the existing codebase patterns
- **THEN** it records the decision in the design artifact with rationale
- **THEN** it does NOT prompt the user

#### Scenario: Ambiguous input requiring clarification

- **WHEN** the change description is too vague to determine the capability domain (e.g., "fix the thing")
- **THEN** the skill asks one specific clarifying question
- **THEN** after receiving an answer it proceeds without further prompting

### Requirement: Skill produces output identical to a manually-driven cycle

The td hierarchy, artifact files, boards, and implementation produced by the autonomous skill SHALL be indistinguishable from a cycle driven manually through the individual sub-skills.

#### Scenario: td structure matches manual cycle

- **WHEN** a change is completed autonomously
- **THEN** the resulting td hierarchy (change root feature, capability features, requirement tasks, research tasks if applicable) matches what `openspec-ff-change` + `openspec-execute` would produce
- **THEN** `openspec status --change "<name>"` shows all artifacts complete
- **THEN** `td board show "<board>"` shows all tasks closed

#### Scenario: Archive is available after completion

- **WHEN** all artifacts are complete and all tasks are closed
- **THEN** the skill notifies the user the change is ready to archive
- **THEN** it does NOT autonomously archive — archiving requires explicit user instruction
