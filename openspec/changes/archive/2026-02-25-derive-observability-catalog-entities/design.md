---
td-board: derive-observability-catalog-entities
td-issue: td-15bdb8
status: proposed
date: 2026-02-25
---

# Design: Derive Observability Catalog Entities

## Context and problem statement

Seven observability and quality technologies (Prometheus, OpenTelemetry, Jest, Trivy, KubeLinter, distroless, Loki) are active in the codebase with documented usage rules and behavioral patterns in OpenSpec, but lack catalog entity definitions. This creates a gap where the developer portal's software catalog does not reflect the full technical stack in use. New team members cannot discover these technologies through the catalog, and the software inventory is incomplete.

## Decision criteria

This design achieves:

- **Technology Discovery**: Each observability tool is discoverable and searchable in the software catalog (100%)
- **Documentation Completeness**: All active technologies have catalog metadata including ownership, lifecycle, and tags (100%)
- **Reduced Onboarding Friction**: New developers can find observability stack documentation in one place (100%)

Explicitly excludes:

- Creating new usage rules (rules already exist from prior changes)
- Migrating existing components to reference these entities (out of scope — entities are purely additive)
- Deep integration with Grafana or Backstage plugins (catalog is read-only for this change)

## Considered options

### Option 1: Manual Entity File Creation (Selected)

Create 7 individual YAML files in `.entities/` directory, one per technology. Each file follows the existing Backstage Resource kind schema. Simple, repeatable, requires no tooling changes.

**Rationale**: Minimal risk, aligns with existing catalog conventions, enables incremental entity addition in the future.

### Option 2: Automated Entity Derivation Script

Write a script that generates entity files from existing OpenSpec rules files automatically, scanning `.opencode/rules/` and deriving catalog entries.

**Rationale Rejected**: Over-engineering for 7 entities; brittle dependency on rules file structure; future rules changes could invalidate catalog entries.

### Option 3: Hybrid Scaffold + Manual Curation

Generate entity templates from rules, then require manual review and curation of owner, lifecycle, and tags.

**Rationale Rejected**: Adds process complexity; no significant benefit over pure manual creation for small entity count.

## Decision outcome

**Implement Option 1**: Manually create 7 catalog resource entity files in `.entities/` using the existing Backstage Resource schema. Each entity will declare:

- **Name and Title**: Technology name (e.g., `prometheus`, `opentelemetry`)
- **Description**: 1-2 sentence summary of purpose and role in the stack
- **Type**: `utility` (for tools/frameworks)
- **Owner**: Platform team that owns the observability stack
- **System**: `developer-platform` (parent system)
- **Tags**: Discoverable tags reflecting domain (e.g., `metrics`, `observability`, `instrumentation`)

Each entity is independently verifiable and follows the existing pattern used by `resource-dagger.yaml` and similar files.

## Risks / trade-offs

- **Risk: Catalog Drift**: If technologies are retired or significantly modified, entities could become stale
  - **Mitigation**: Include a note in tech-radar.md linking to this change; establish annual catalog audit; entities inherit lifecycle status from OpenSpec changes
  
- **Trade-off: No Automatic Sync**: If usage rules change, catalog entities are not automatically updated
  - **Mitigation**: Future work can add sync tooling; for now, manual updates during design phase of related changes

- **Risk: Incomplete Tag Coverage**: Tags might not match all discovery paths users expect
  - **Mitigation**: Use tags from existing component entities and observability-related OpenSpec documentation

## Migration plan

1. Create all 7 resource entity YAML files in `.entities/` directory (one per technology)
2. Validate YAML syntax and Backstage schema compliance
3. Commit files and verify catalog system reloads without errors
4. (No rollback needed — entity files are purely additive and do not modify existing resources)

## Confirmation

How to verify this design is met:

- **Test cases**: Each entity file parses as valid Backstage YAML with required fields present
- **Metrics**: 7 new resources appear in the software catalog; each is discoverable via tag search
- **Acceptance criteria**: Developers can navigate to each technology's resource card in the catalog and see owner, description, and lifecycle status

## Open questions

- Should distroless be a `Resource` (tool) or `Domain` (architectural pattern)? → Decision: Resource (aligns with how images are treated)
- Should we create a parent `observability-stack` system to group these entities? → Defer to future change; currently they're independent Resources

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Prometheus | platform-team | `.opencode/rules/patterns/observability/metrics-collection.md` | reviewed |
| OpenTelemetry | platform-team | `.opencode/rules/patterns/observability/span-instrumentation.md` | reviewed |
| Jest | platform-team | `.opencode/rules/patterns/code/testing.md` | reviewed |
| Trivy | platform-team | `.opencode/rules/patterns/delivery/security-scanning.md` | reviewed |
| KubeLinter | platform-team | `.opencode/rules/patterns/delivery/iac-validation.md` | reviewed |
| distroless | platform-team | `.opencode/rules/patterns/delivery/container-images.md` | reviewed |
| Loki | platform-team | `.opencode/rules/patterns/observability/log-aggregation.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Catalog entity derivation | LLM agents | `.opencode/skills/dev-portal-manager/SKILL.md` | none | Skill already exists and is current; this change applies the skill |
| OpenSpec artifact authoring | LLM agents | `.opencode/skills/openspec-ff-change/SKILL.md` | none | No workflow changes to how agents create artifacts |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Resource | prometheus | create | platform-team | `.entities/resource-prometheus.yaml` | declared | Catalog entity for Prometheus metrics system |
| Resource | opentelemetry | create | platform-team | `.entities/resource-opentelemetry.yaml` | declared | Catalog entity for OpenTelemetry instrumentation framework |
| Resource | jest | create | platform-team | `.entities/resource-jest.yaml` | declared | Catalog entity for Jest testing framework |
| Resource | trivy | create | platform-team | `.entities/resource-trivy.yaml` | declared | Catalog entity for Trivy scanner |
| Resource | kubelinter | create | platform-team | `.entities/resource-kubelinter.yaml` | declared | Catalog entity for KubeLinter validator |
| Resource | distroless | create | platform-team | `.entities/resource-distroless.yaml` | declared | Catalog entity for distroless base images |
| Resource | loki | create | platform-team | `.entities/resource-loki.yaml` | declared | Catalog entity for Loki log aggregation |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | No prerequisite changes needed; all technology adoption rules already exist | — |
