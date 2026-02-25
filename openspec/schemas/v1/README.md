# V1 (spec-td): OpenSpec with TD Integration

This `openspec` schema integrates the `td` CLI tool with the `openspec` spec-driven-development framework.

## Design Principles

**The goal is to use `td` as the source of truth for agent work** while maintaining a human-readable OpenSpec filesystem for auditing and continuity.

- **Agents work in td**, not in spec files
- **Documents are auto-generated** from td state via pre-commit hooks
- **Filesystem remains clean** - no manual document editing during implementation
- **Token efficiency** - agents manage small td operations, not large document parses

## 3-Level TD Hierarchy

```
Epic (td-xxxxx)
└── Proposal Feature/Bug (parent=epic_id)
    ├── Spec Feature/Bug (parent=proposal_feature_id)
    │   ├── Requirement Task (label=requirement, parent=spec_feature_id)
    │   ├── Requirement Task (label=requirement, parent=spec_feature_id)
    │   └── ...
    ├── Spec Feature/Bug (parent=proposal_feature_id)
    │   └── Requirement Task (label=requirement, parent=spec_feature_id)
    └── ...
```

## Workflow

### 1. Create Proposal → Create Proposal Feature/Bug in TD

```bash
td create -t feature --title "<proposal-description>" --parent <epic_id>
# Store result as proposal_feature_id in proposal.md
```

### 2. Create Specs → Create Spec Feature/Bugs + Requirement Tasks in TD

For each spec:

```bash
td create -t feature -d "<spec-name>" --parent <proposal_feature_id>
# Store result as spec_feature_id in spec.md

# For each requirement:
td create -t task -d "Requirement: <name>" --parent <spec_feature_id> --label requirement
# Include task ID in requirement markdown
```

### 3. Implement → Work Entirely in TD

```bash
td start <requirement_task_id>
td log "Progress description"
td handoff <requirement_task_id> --done "..." --remaining "..."
```

### 4. Documents Auto-Generate via Pre-Commit

- Pre-commit hook runs `opsx-render <change>` before every commit
- Renders spec.md and tasks.md from current td state
- Maintains filesystem sync without manual editing
- Spec files are auto-commented: "This file is auto-generated from td state. Edit in td, not here."

## TD as Source of Truth

The `td` CLI interactions are the authoritative record of agent work.

- spec.md and tasks.md are rendered snapshots, not editable documents
- `td context <task_id>` provides all info agents need to resume work
- `td log` and `td handoff` capture decisions and progress
- Complete audit trail maintained in td

## Pre-Commit Rendering

**Do NOT manually edit spec.md or tasks.md files** - they will be overwritten by pre-commit hooks.

Instead:

1. Make changes in td (create specs, tasks, log progress)
2. Commit your changes (`git commit`)
3. Pre-commit hook automatically runs `opsx-render` to update documents
4. Documents are staged and included in your commit

This ensures documents always match td state - no drift, no conflicts.
