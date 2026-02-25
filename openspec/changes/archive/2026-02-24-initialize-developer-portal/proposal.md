---
td-board: initialize-developer-portal
td-issue: td-550c57
---

# Proposal: Initialize Developer Portal Management Automations

## Why

The `platform-architect` agent currently lacks structured guidance for managing the software catalog, resulting in inconsistent entity definitions, missing documentation conventions, and no automation for deriving catalog entities from existing project metadata. Establishing a `dev-portal-manager` skill gives the architect a repeatable, spec-backed process for catalog curation, documentation scaffolding, and ADR integration — closing the gap between design-phase decisions and the developer portal's live state.

## What Changes

- Add a new `dev-portal-manager` skill under `.opencode/skills/dev-portal-manager/` that the `platform-architect` loads during architecture/design phases
- The skill documents how catalog entities (Component, System, Domain, Group, Resource) are defined, authored, and stored under `.entities/`
- The skill specifies automation scripts that derive `resource` catalog entities from existing project files (`devbox.json` → utility resources, `package.json` → node-library resources)
- The skill describes required documentation structure to support Backstage TechDocs, the ADRs plugin, and the Tech Radar plugin
- The skill describes the convention of symlinking a change's `design.md` into the relevant entity's `adrs/` directory
- Update `platform-architect.md` to reference the new `dev-portal-manager` skill alongside the existing `catalog-curation` guidance

## Capabilities

### New Capabilities

- `dev-portal-manager`: Skill that guides the platform-architect on catalog entity authoring, documentation structure, script-based entity derivation, and ADR/symlink conventions for the developer portal

### Modified Capabilities

- `platform-architect-agent`: The agent definition will be updated to load and reference `dev-portal-manager` during the architecture phase (requirement: must load skill before catalog entity decisions)

## Impact

- Affected services/modules: `.opencode/agents/platform-architect.md`, `.opencode/skills/dev-portal-manager/` (new)
- API changes: None
- Data model changes: None — entity YAML format remains consistent with existing `.entities/` conventions
- Dependencies: Backstage (TechDocs, ADRs plugin, Tech Radar plugin) — no new software dependencies introduced; skill documents usage patterns for already-chosen tooling
</content>
</invoke>