---
td-board: enhance-design-spec-skills-with-rules-openspec-ff-change-skill
td-issue: td-55eccd
---

# Specification: openspec-ff-change-skill

## Overview

Updates the `openspec-ff-change` skill to perform the same rule-coverage audit and research task creation as `openspec-continue-change`, applied during fast-forward artifact generation. Because ff-change generates all artifacts in sequence without pausing, the audit must be woven into each artifact's creation step rather than run interactively.

## ADDED Requirements

### Requirement: ff-change runs rule-coverage audit during specs artifact fast-forward - td-5a9345

When generating the specs artifact during fast-forward, the skill SHALL perform the same rule-coverage audit as the `openspec-continue-change` specs phase: consult the canonical patterns list, identify relevant domains per capability, create research tasks for missing rules, and wire dependencies.

#### Scenario: Fast-forward reaches the specs artifact step

- **WHEN** `openspec-ff-change` is generating the specs artifact for a capability
- **THEN** after creating requirement tasks, the skill performs the rule-coverage audit
- **THEN** research tasks and dependency wiring are created as they would be in `openspec-continue-change`
- **THEN** the audit result is shown in the fast-forward progress output (e.g., "⚠ 2 research tasks created for missing rules")

#### Scenario: Fast-forward with no missing rules

- **WHEN** all pattern domains relevant to the capabilities being specced already have rule files
- **THEN** the fast-forward continues without creating research tasks
- **THEN** the progress output notes "✓ Rule coverage complete"

### Requirement: ff-change runs rule-coverage audit during design artifact fast-forward - td-87c818

When generating the design artifact during fast-forward, the skill SHALL perform the same rule-coverage supplement audit as the `openspec-continue-change` design phase: review the Technology Adoption table and pattern decisions, create supplementary research tasks for any new gaps, and wire dependencies from cross-cutting tasks.

#### Scenario: Fast-forward reaches the design artifact step

- **WHEN** `openspec-ff-change` is generating the design artifact
- **THEN** after creating cross-cutting tasks from design decisions, the skill performs the design-phase audit
- **THEN** any additional research tasks are created and wired
- **THEN** the fast-forward progress output reflects any new research tasks created

### Requirement: ff-change creates research tasks and wires dependencies during fast-forward - td-5d98fa

The research task creation and dependency wiring logic in `openspec-ff-change` SHALL be identical to that in `openspec-continue-change`: same td hierarchy (research tasks under `td-research` feature), same `td dep add` wiring, same task description format with canonical reference and source literature.

#### Scenario: ff-change and continue-change produce identical td structures

- **WHEN** a change is fast-forwarded with `openspec-ff-change`
- **THEN** the resulting td hierarchy (research feature, research tasks, dependency wiring) is indistinguishable from one produced by sequential `openspec-continue-change` invocations
- **THEN** the apply skill can operate on either without any difference in behaviour

#### Scenario: ff-change pauses if canonical document is absent

- **WHEN** `.opencode/rules/patterns/README.md` does not exist during fast-forward
- **THEN** the skill warns the architect that the rule-coverage audit cannot run
- **THEN** the skill continues with artifact generation but notes the audit was skipped
- **THEN** the warning is surfaced in the final fast-forward summary
