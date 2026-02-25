## Context

The spec-driven workflow currently uses `tasks.md` as its implementation tracker. During the apply phase, agents read `tasks.md` to find pending work, implement each task, and mark checkboxes (`- [ ]` → `- [x]`) to record progress. The verify and archive skills also read `tasks.md` to assess completion.

This approach has structural limits: markdown checkboxes carry no metadata beyond a binary state, offer no way to log decisions or blockers against a specific task, and give the next session no way to resume work intelligently without re-reading the whole file.

`td` already exists in this environment as a purpose-built task store. It models tasks as first-class objects with status transitions, structured log entries (decisions, blockers, hypotheses, results), file links, and session handoffs. The goal is to make `td` the sole implementation tracker — replacing `tasks.md` entirely, not supplementing it.

## Goals / Non-Goals

**Goals:**
- Remove the `tasks` artifact and `tasks.md` from both schemas entirely
- Integrate `td` task creation into the `specs` and `design` artifact authoring steps
- Remove all references to `tasks.md` checkboxes from apply, verify, and archive skills
- Update apply to drive implementation via `td` commands (`td start`, `td log`, `td handoff`, etc.)
- Update verify to assess completion via `td` state rather than checkbox counts
- Update archive to guard against open `td` issues rather than unchecked boxes
- Update `openspec-continue-change` to reflect that specs and design now create `td` issues as part of authoring

**Non-Goals:**
- Generating a `tasks.md` snapshot from `td`
- Introducing a new `td-tasks` artifact — task creation is woven into existing artifacts, not a separate phase
- Changing the proposal, specs, or design artifact *formats* beyond adding frontmatter
- Changing how `td` itself works — we use it as-is
- Migrating any existing changes that already have a `tasks.md`

## Decisions

### D1: No `td-tasks` artifact — task creation is part of spec and design authoring

**Decision**: There is no separate task-creation artifact. When an agent writes `specs/<capability>/spec.md`, it immediately creates `td` issues for each requirement in that spec. When an agent writes `design.md`, it creates `td` issues for cross-cutting tasks identified there. Task creation is a side effect of authoring, not a separate phase.

**Alternatives considered**:
- *A `td-tasks` artifact after specs+design* — preserves the existing phase boundary but adds a step with no new information; specs and design already contain everything needed to decompose tasks
- *Keep `tasks.md` as the decomposition artifact* — rejected per proposal

**Rationale**: The requirement is the spec. The task is "implement this requirement." Keeping them together eliminates the gap where tasks drift from specs.

### D2: `td` hierarchy — feature → feature → task, with external epic

**Decision**: The `td` issue tree for a change has this shape:

```
<external-epic>           --type epic     (provided by user, not created by openspec)
└── <change-name>         --type feature  (created at proposal time)
    ├── <capability-name> --type feature  (created per spec, --parent <change-id>)
    │   └── <req task>    --type task     (created per requirement, --parent <spec-id>)
    └── <cross-cutting>   --type task     (created from design, --parent <change-id>)
```

The epic is an optional external input passed at change creation time. If provided, the change root feature uses it as `--parent`. Spec nodes are `feature`, not `epic` — no epics are created by openspec. Design tasks parent directly to the change root (no intermediate design node).

**Alternatives considered**:
- *Labels/tags for grouping* — rejected; parent-child hierarchy is the idiomatic `td` structure and is queryable via `descendant_of`
- *A design node as intermediate parent for cross-cutting tasks* — adds a node with no corresponding artifact; rejected in favor of flat design tasks under the change root

**Rationale**: The hierarchy mirrors the spec structure. Boards using `descendant_of` give correct scoped views at any level without extra tagging.

### D3: Boards use `descendant_of` queries

**Decision**: Two boards are created per change:
- One change-level board: `td board create "<change-name>" "descendant_of(<change-id>)"`
- One spec-level board per capability: `td board create "<change-name>-<capability>" "descendant_of(<spec-id>)"`

Board names follow `<change-name>` and `<change-name>-<capability>` conventions.

**Alternatives considered**:
- *Label-based boards* — `labels ~ <change-name>` requires every `td create` call to pass the correct label; a missed `--labels` breaks the board silently. Parent-child is enforced structurally.

**Rationale**: `descendant_of` is recursive and requires no per-issue annotation beyond correct parenting. The tree structure already encodes the organization.

### D4: Frontmatter on openspec artifacts declares `td` anchors

**Decision**: Each openspec artifact gets YAML frontmatter with two fields:
- `td-board`: the board name for the narrowest relevant scope
- `td-issue`: the `td` issue id that represents this artifact in the hierarchy

| Artifact | `td-board` | `td-issue` |
|---|---|---|
| `proposal.md` | `<change-name>` | change root id |
| `design.md` | `<change-name>` | change root id |
| `specs/<cap>/spec.md` | `<change-name>-<capability>` | spec feature id |

Frontmatter is written by the agent at the same time `td` issues are created — not retroactively.

**Rationale**: Frontmatter makes the `td` connection discoverable from the artifact itself. An agent reading `spec.md` knows immediately which board and which parent issue govern it.

### D5: `td link` connects issues to their source artifacts

**Decision**: After creating each `td` issue, the agent runs:
```
td link <id> <artifact-file> --role reference
```

Spec feature nodes and their requirement tasks are linked to `spec.md`. Design tasks are linked to `design.md`. This makes `td files <id>` useful for tracing an issue back to its requirement source.

**Rationale**: Completes the two-way linkage: frontmatter points artifact → `td`, `td link` points `td` → artifact.

### D6: Apply skill drives work via `td board show` + `td next` + `td start` loop

**Decision**: The apply loop replaces checkbox scanning with:
1. `td board show "<change-name>"` to see all remaining work
2. `td next` to pick the highest-priority open task
3. `td start <id>` to begin, `td log` to record progress, `td handoff` or `td review` to finish

The apply skill reads the `td-board` and `td-issue` values from `proposal.md` frontmatter to know which board and change root to operate on.

**Alternatives considered**:
- *Agent picks tasks in written order* — `tasks.md` preserved ordering; `td` gives priority-aware scheduling instead
- *Work all tasks without `td start`* — loses session-resumability

**Rationale**: Using `td`'s native lifecycle commands is the point. Future sessions can run `td context <id>` to resume mid-task with full history.

### D7: Schema `apply.tracks` removed; `apply.requires` updated

**Decision**: The `apply` block changes from:
```yaml
apply:
  requires: [tasks]
  tracks: tasks.md
```
to:
```yaml
apply:
  requires: [specs, design]
```

The `tasks` artifact entry is removed entirely from both schemas. The `tasks.md` templates are deleted.

**Rationale**: `tracks` was only meaningful when there was a file to parse. `td` is queried directly by the skill.

### D8: Verify and archive use `td board show` for completion checks

**Decision**:
- **Verify** completeness: `td board show "<change-name>"` and flag any issues not in `closed` status as incomplete
- **Archive** guard: same query — warn if any open issues remain before archiving

**Rationale**: Direct equivalent of the checkbox count, with richer per-task context available if needed.

## Risks / Trade-offs

- **[Risk] `td` must be initialized before a change can use it** → Mitigation: Proposal authoring instructions include a `td init` prerequisite check; the agent runs it if the database is missing before creating the change root issue.

- **[Risk] Agent forgets to create `td` issues during spec/design authoring** → Mitigation: Skill instructions for `specs` and `design` artifacts make `td` issue creation an explicit, required step — not optional guidance. The apply skill also checks that `td board show` returns results before starting; if the board is empty it surfaces the gap.

- **[Risk] `td` state is local and not version-controlled** → The change's `td` issues do not travel with the git repo. Deferred per proposal — this is a known trade-off of the local-first `td` model.

- **[Trade-off] No human-readable task file** → `tasks.md` was browsable in the repo. Task status now lives in `td`. Acceptable per the proposal's explicit decision.

## Migration Plan

1. Update `openspec/schemas/spec-driven-custom/schema.yaml`:
   - Remove `tasks` artifact entry
   - Update `specs` and `design` artifact instructions to include `td` issue creation steps
   - Update `apply` block: remove `tracks: tasks.md`, change `requires` from `[tasks]` to `[specs, design]`, update instruction to describe `td`-based apply loop
2. Update `openspec/schemas/v1/schema.yaml` identically
3. Delete `openspec/schemas/v1/templates/tasks.md` and `openspec/schemas/spec-driven-custom/templates/tasks.md`
4. Update `.opencode/skills/openspec-apply-change/SKILL.md` — replace checkbox loop with `td board show` + `td next` + `td start` loop
5. Update `.opencode/skills/openspec-verify-change/SKILL.md` — replace `tasks.md` completeness check with `td board show` check
6. Update `.opencode/skills/openspec-archive-change/SKILL.md` — replace `tasks.md` guard with `td board show --status open` guard
7. Update `.opencode/skills/openspec-continue-change/SKILL.md` — remove `tasks.md` artifact pattern, update `specs` and `design` patterns to include `td` creation steps

**Rollback**: All changes are to schema YAML files and skill markdown files. Reverting those files is sufficient; existing changes with `tasks.md` are unaffected.

## Open Questions

- **Q1**: Should `openspec instructions apply` (the CLI command) be updated to query `td` for progress, or should the skill read `td` directly? For now the apply skill calls `td` directly; updating the CLI is out of scope.
