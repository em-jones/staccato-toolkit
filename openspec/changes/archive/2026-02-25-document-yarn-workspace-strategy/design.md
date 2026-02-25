---
td-board: document-yarn-workspace-strategy
td-issue: td-45f57a
tech-radar: []
---

# Design: Document Yarn Workspace Strategy

## Context and problem statement

The repository has adopted Yarn 4.12.0 as its package manager and monorepo workspace tool, evidenced by the `packageManager` declaration in `package.json` at version `yarn@4.12.0+sha512...`. However, this adoption lacks:

1. An architecture decision record explaining why Yarn was selected over npm, Bun, and pnpm
2. Pattern rules governing dependency management and workspace isolation
3. Correction of the canonical repository layout rule, which currently documents Bun as the workspace tool

Without this documentation, future maintainers cannot understand the architectural intent, new developers lack guidance on dependency management patterns, and there is a discrepancy between documented expectations (Bun) and implementation reality (Yarn).

## Decision criteria

This design achieves:

- **Rationale Capture** (35%): Document why Yarn was selected and when it can be reconsidered
- **Governance Clarity** (35%): Establish clear rules for dependency declaration and workspace isolation
- **Documentation Accuracy** (30%): Correct the canonical repository layout rule to reflect actual implementation

Explicitly excludes:

- Implementation of new Yarn features or configuration changes
- Migration from any existing package manager (Yarn is already in use)
- Changes to developer workflows (documentation only)

## Decision outcome

### Design Strategy: Three-Artifact Documentation Pattern

This change creates three complementary documentation artifacts:

1. **Architecture Decision Record (ADR)**: `docs/adr/yarn-workspace-strategy.md`
   - Captures the decision context and rationale for Yarn 4.12.0
   - Documents alternatives considered (npm workspaces, Bun, pnpm) and why each was deprioritized
   - Establishes decision ownership and criteria for reconsideration

2. **Pattern Rules**: Three new pattern rules under `.opencode/rules/patterns/`:
   - `.opencode/rules/patterns/architecture/yarn-workspaces.md`: Workspace isolation and dependency scoping
   - `.opencode/rules/patterns/delivery/yarn-lock-management.md`: Lock file governance and reproducible installs
   - `.opencode/rules/patterns/delivery/yarn-pnp-strategy.md`: Plug'n'Play mode configuration and compatibility

3. **Repository Layout Correction**: Update `.opencode/rules/patterns/architecture/repository-layout.md`
   - Replace references to Bun with accurate Yarn documentation
   - Link to the new ADR as the decision authority
   - Update example tree and root files table to reflect `.yarn/` structure

### Why This Approach

- **ADR** establishes the strategic decision and rationale — essential for stakeholder alignment and future reconsideration
- **Pattern Rules** provide operational guidance for developers and agents working within the monorepo workspace
- **Layout Correction** fixes the discrepancy between documentation and implementation, restoring trust in canonical reference materials
- **Pattern Rules** can be referenced by subsequent changes (e.g., adoption of additional workspaces, integration with new tools) without duplicating decision context

## Risks / trade-offs

- **Risk**: ADR may document decisions that are outdated by the time it is read → **Mitigation**: ADR includes explicit criteria for reconsideration and is version-controlled, allowing for future amendments with explicit change history
- **Trade-off**: Pattern rules are lengthy and detailed to ensure clarity for diverse developer backgrounds → **Mitigation**: Use examples and scenarios to make rules more accessible
- **Risk**: Yarn PnP mode compatibility with tools may change over time → **Mitigation**: Pattern rule on PnP strategy includes compatibility matrix with known workarounds and update path

## Migration plan

**Phase 1: Design & Documentation Authoring** (current)
- Create ADR explaining decision context, alternatives, and rationale
- Author pattern rules for workspace isolation, lock file management, and PnP strategy
- Update repository layout rule to correct Bun → Yarn references

**Phase 2: Verification**
- Review ADR for completeness and alignment with historical decisions
- Validate pattern rules against actual developer workflows and CI/CD practices
- Verify repository layout rule updates are accurate and discoverable

**Phase 3: Rollout**
- Archive change to publish documentation to canonical locations
- Announce ADR and pattern rules in developer communications
- Update onboarding materials to reference the new Yarn strategy documentation

**Rollback**: None required — this is documentation. If decisions need to be reversed, they are amended in the ADR with new entries, creating an explicit audit trail.

## Confirmation

How to verify this design is met:

- **ADR exists and is complete**: `docs/adr/yarn-workspace-strategy.md` documents decision context, alternatives, rationale, and reconsideration criteria
- **Pattern rules created**: Three new pattern rules exist and are discoverable from `.opencode/rules/patterns/README.md`
- **Repository layout updated**: `.opencode/rules/patterns/architecture/repository-layout.md` accurately reflects Yarn (not Bun) with links to ADR
- **Rules are linked**: All requirement tasks are linked to corresponding documentation files
- **TD tasks are created**: All implementation work is captured and tracked in the change board

## Open questions

- Should the Yarn PnP mode be mandatory or optional for workspace packages? (Addressed in pattern rule with compatibility matrix; optional with documented tooling support)
- Are there Yarn configuration files (`.yarnrc.yml`) that should be added to the canonical repository layout? (Yes, addressed in layout correction)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| n/a — no new technologies adopted; documentation only | — | — | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Yarn workspace strategy documentation | platform-architect, developer | — | none | Documentation changes do not alter agent workflows; developers consult docs, they do not implement new agent behaviors |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated software catalog entities; documentation only |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | ADR created: `docs/adr/yarn-workspace-strategy.md` |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
