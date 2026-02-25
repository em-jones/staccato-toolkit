---
td-board: autonomous-openspec-skill
td-issue: td-c590b4
status: "proposed"
date: 2026-02-24
decision-makers: [openspec agent]
---

# Design: Autonomous OpenSpec Skill

## Context and problem statement

The OpenSpec workflow is currently split across multiple user-invoked skills (`/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-archive`). Each skill handles one phase and pauses for human direction before proceeding. When an agent has sufficient context to make all decisions autonomously, these interruptions add latency and friction without providing value. We need a skill that can drive the entire cycle — from change creation to implementation to archive — in a single invocation, pausing only when a genuine human decision is required.

## Decision criteria

This design achieves:

- **Minimal interruption** [40%]: The agent completes the full cycle without prompting the user unless truly blocked
- **Correctness parity** [35%]: Output (artifacts, td issues, boards, implementations) is indistinguishable from a manually-driven cycle
- **Composability** [25%]: The skill delegates to existing CLI and skill logic rather than duplicating it; future changes to sub-skills are inherited automatically

Explicitly excludes:

- Replacing the existing step-by-step skills — they remain for users who prefer interactive control
- Bypassing the reviewer-mode constraint (a different session must approve tasks the same session implemented)
- Handling multi-repo or multi-project changes

## Considered options

### Option 1: Orchestrator skill (delegates to existing sub-skill logic)

The autonomous skill is a thin orchestrator that loads and follows the logic of each existing skill in sequence: `openspec-new-change` → `openspec-ff-change` → `openspec-execute` → `openspec-archive-change`. Sub-skill instructions are read from their SKILL.md files and applied in order.

### Option 2: Monolithic skill (duplicates all logic inline)

Write a single self-contained SKILL.md that inlines all steps from all phases. No delegation to sub-skills.

## Decision outcome

**Option 1 (orchestrator)** is chosen. Delegating to existing sub-skills avoids duplication, ensures correctness parity by construction, and means any improvements to sub-skills are automatically inherited. The skill's only unique logic is: how to proceed without pausing, how to decide when a pause IS required, and how to handle the reviewer-mode session constraint.

The reviewer-mode constraint (a task cannot be reviewed by the session that implemented it) is a hard limit of `td`. The skill handles this by: completing all implementation tasks and submitting them for review, then instructing the agent to treat itself as a "fresh reviewer context" (as `openspec-execute` already does), and approving tasks that pass review.

## Risks / trade-offs

- Risk: Autonomous execution makes irreversible changes (file writes, td state) without user confirmation → Mitigation: The skill announces its plan at the start and pauses before the execute phase to let the user abort
- Risk: Ambiguous proposal leads to wrong capabilities being specced → Mitigation: The skill asks one clarifying question if the input description is under ~10 words or lacks a clear domain
- Trade-off: Reviewer mode is simulated within the same session context — the "fresh reviewer" is the same model instance with a self-instructed perspective shift. This is a known limitation of the td session model and is identical to how `openspec-execute` handles it

## Migration plan

No migration required. This is a new skill file added to `.opencode/skills/development-orchestration/SKILL.md`. No existing skills or files are modified.

Rollout:
1. Write `SKILL.md` per the spec
2. Verify by running the skill on a test change end-to-end
3. Register in the skills list in the agent guidelines if applicable

## Confirmation

How to verify this design is met:

- Test cases: Run the skill on a minimal change; confirm all artifacts created, all tasks implemented and closed, change archived — without any user prompt being required beyond the initial description
- Acceptance criteria: `openspec status --change "<name>"` shows all artifacts complete; `td board show` shows all tasks closed; archived change directory exists

## Open questions

- Should the skill support a `--dry-run` flag that shows the plan without executing? (deferred to a future change)
- Should autonomous mode be available as a flag on existing skills (e.g., `--auto`) rather than a separate skill? (decided: separate skill is simpler and more discoverable for now)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new catalog entities introduced |
