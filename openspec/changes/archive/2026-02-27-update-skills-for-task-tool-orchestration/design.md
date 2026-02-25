---
status: "accepted"
date: 2026-02-26
decision-makers: [platform-architect]
tech-radar: []
td-board: update-skills-for-task-tool-orchestration
td-issue: td-10faac
---

# Design: Update OpenSpec Skills to Use Task Tool for Worker Orchestration

## Context and problem statement

The OpenSpec orchestration skills (`development-orchestration`, `openspec-execute`, `openspec-ff-change`, `openspec-continue-change`) describe worker dispatch using vague prose: "Launch one `worker` agent per stream simultaneously." This leaves the actual invocation mechanism undefined, causing ambiguity for any agent reading the skill. Claude Code provides a concrete `Task` tool (`mcp_task`) with a `subagent_type` parameter that distinguishes `worker`, `general`, and `explore` agents. The skills must be updated to use this tool explicitly so the dispatch mechanism is unambiguous and correct.

## Decision criteria

This design achieves:

- **Unambiguous dispatch**: Skills prescribe the exact tool call format, not vague prose (weight: 60%)
- **Correct parallelism**: Multiple streams dispatched in a single message as simultaneous `Task` calls (weight: 30%)
- **Minimal diff**: Only the worker dispatch and role sections change; all other skill logic is preserved (weight: 10%)

Explicitly excludes:

- Changes to `td` workflow (task creation, handoffs, review)
- Changes to artifact authoring logic in `openspec-ff-change` or `openspec-continue-change`
- Changes to non-orchestration skills (e.g., `go-developer`, `observability-instrumentation`)

## Considered options

### Option 1: Update prose only (keep vague)

Keep "Launch one `worker` agent per stream" but add a footnote about the Task tool. Rejected because ambiguity is the problem — a footnote doesn't resolve it.

### Option 2: Update dispatch sections to reference Task tool with concrete format

Replace prose with exact `Task` tool call structure, including `subagent_type: "worker"`, `description` conventions, and `prompt` format. Selected because it eliminates ambiguity and provides a copy-paste-ready pattern.

## Decision outcome

Update the four skills to reference the `Task` tool with `subagent_type: "worker"` for worker dispatch. The key change in `development-orchestration` Step 5b is:

**Before:**
```
Launch one `worker` agent per stream simultaneously. Do NOT wait for one to finish before launching the next.

Each worker receives this prompt — and nothing else:
...
```

**After:**
```
Dispatch one worker per stream simultaneously using the Task tool. Issue all Task tool calls in a single message — one per stream:

Task tool call per stream:
- subagent_type: "worker"
- description: "Implement <change-name>-<capability> tasks"
- prompt: |
    Load and follow the `openspec-execute` skill exactly.
    Your assigned board: <change-name>-<capability>
    Stop after submitting all tasks on your board for review. Do not rotate session or review.
```

The `openspec-execute` Role section gains a clarification: "This skill is invoked inside a `worker` subagent spawned by the `Task` tool (`subagent_type: "worker"`) from the orchestrator."

The worker epic purpose notes in `openspec-ff-change` and `openspec-continue-change` are updated to reference the `Task` tool dispatch mechanism.

## Risks / trade-offs

- Risk: Claude Code tool names change in future versions → Mitigation: Skills reference the logical name `Task tool` + parameter values; the tool is environment-defined
- Trade-off: More explicit format means the skill is slightly longer, but clarity is worth the verbosity

## Migration plan

1. Edit `development-orchestration/SKILL.md`: Update Step 5b (dispatch) and Step 5c (catalog dispatch) to reference `Task` tool with `subagent_type: "worker"`
2. Edit `openspec-execute/SKILL.md`: Update Role section to reference `Task` tool invocation
3. Edit `openspec-ff-change/SKILL.md`: Update step 4b2 worker epic note
4. Edit `openspec-continue-change/SKILL.md`: Update Worker epic purpose note under `specs/<capability>/spec.md` artifact
5. No rollback needed — these are documentation-only changes to Markdown files

## Confirmation

- All four skill files contain the phrase `subagent_type: "worker"` in the relevant dispatch sections
- `development-orchestration` Step 5b describes a concrete `Task` tool call structure with `description` and `prompt` fields
- `openspec-execute` Role section mentions `Task` tool invocation
- Worker epic purpose notes in `openspec-ff-change` and `openspec-continue-change` reference `Task` tool dispatch

## Open questions

None.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Task tool worker dispatch | platform-architect, all orchestrator agents | `.opencode/skills/development-orchestration/SKILL.md` | update | Dispatch language updated to reference Task tool |
| Task tool worker dispatch | worker agents | `.opencode/skills/openspec-execute/SKILL.md` | update | Role section updated to clarify Task tool invocation |
| Task tool worker dispatch | orchestrator agents | `.opencode/skills/openspec-ff-change/SKILL.md` | update | Worker epic note updated |
| Task tool worker dispatch | orchestrator agents | `.opencode/skills/openspec-continue-change/SKILL.md` | update | Worker epic purpose note updated |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated entities introduced by this change |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
