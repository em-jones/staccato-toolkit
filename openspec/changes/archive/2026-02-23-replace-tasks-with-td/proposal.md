## Why

The current `tasks.md`-based workflow requires agents to manually edit a markdown file as the implementation tracking source of truth, which loses structured metadata (status, decisions, blockers, file links) and makes it hard to resume, hand off, or audit work across sessions. Replacing `tasks.md` entirely with `td` task management gives every task a structured lifecycle, rich logging, and session continuity — with no markdown file to maintain.

## What Changes

- **BREAKING**: The `tasks` artifact is removed from the spec-driven schema; `tasks.md` is no longer created, tracked, or referenced anywhere in the workflow
- **BREAKING**: The `apply` phase no longer reads `tasks.md` or tracks checkboxes; it uses `td` exclusively (`td start`, `td log`, `td handoff`, etc.)
- `td` issue creation is woven into the `specs` and `design` artifact authoring steps — no separate task-creation phase
- Each spec creates a `td` feature issue (spec node) and a `td` task issue per requirement, all parented under a change root feature issue created at proposal time
- `td` boards (using `descendant_of` queries) provide change-scoped and spec-scoped views of all tasks
- Skills that referenced `tasks.md` (`openspec-apply-change`, `openspec-verify-change`, `openspec-archive-change`, `openspec-continue-change`) are updated to use `td` commands for task tracking, progress, and completion checks
- Schema templates for `tasks.md` are removed

## Capabilities

### New Capabilities

- `td-task-integration`: How `td` issues are created as part of spec and design authoring — covers the change root feature, spec feature nodes, per-requirement task issues, board creation via `descendant_of`, `td link` for artifact association, frontmatter, and the full task lifecycle (open → in_progress → in_review → closed)

### Modified Capabilities

*(No existing spec-level capabilities are changing; this replaces an implementation mechanism, not a user-facing requirement.)*

## Impact

- `openspec/schemas/v1/schema.yaml` and `openspec/schemas/spec-driven-custom/schema.yaml` — `tasks` artifact removed; `td` issue creation steps added to `proposal`, `specs`, and `design` artifact instructions; `apply` block updated
- `openspec/schemas/*/templates/tasks.md` — removed
- `.opencode/skills/openspec-apply-change/` — apply loop rewritten to use `td` instead of `tasks.md`
- `.opencode/skills/openspec-verify-change/` — verification updated to check `td` task completion
- `.opencode/skills/openspec-archive-change/` — archive guard updated to check `td` open items
- `.opencode/skills/openspec-continue-change/` — artifact creation guidelines updated to include `td` issue creation steps for `proposal`, `specs`, and `design`
- No external dependencies added; `td` is already present in the environment
