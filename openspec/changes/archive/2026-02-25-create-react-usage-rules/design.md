---
td-board: create-react-usage-rules
td-issue: td-885b83
tech-radar: []
---

# Design: Create React Usage Rules

## Context and Problem Statement

React is the core UI framework for Backstage frontend development, yet the platform lacks comprehensive, documented usage rules for component patterns, hooks usage, and Backstage-specific architectural conventions. This results in inconsistent code patterns across plugins, makes code reviews difficult, and creates a steep learning curve for new contributors.

## Decision Criteria

This design achieves:

- **Consistency**: Establish single source of truth for React patterns in Backstage (weight: 35%)
- **Onboarding**: Reduce friction for new contributors learning Backstage frontend patterns (weight: 30%)
- **Governance**: Enable automated tooling and linters to enforce patterns (weight: 20%)
- **Quality**: Improve code review processes and plugin stability (weight: 15%)

Explicitly excludes:

- Component migration: This change documents patterns but does not mandate migration of existing code
- State management framework: Usage rules cover React hooks; architectural decisions about state libraries (Redux, Jotai, etc.) are out of scope
- Build tooling changes: No changes to build configuration or bundling strategy
- Performance optimization specifics: General patterns are included; detailed optimization is component-specific

## Considered Options

### Option 1: Single monolithic rules document

Create one large rules document covering all React patterns. Rejected because it would be difficult to navigate, maintain, and would create poor cognitive boundaries between different concerns.

### Option 2: Distributed ad-hoc documentation (status quo)

Continue with scattered documentation across plugin repositories. Rejected because this is the current painful state we're addressing.

### Option 3: Structured capability-based rules (chosen)

Create modular, reusable rule documents organized by capability (component patterns, hooks, plugin architecture, reusable components). Each capability is testable and independently maintainable.

## Decision Outcome

We will create four comprehensive usage rule documents, each addressing a distinct aspect of React development in Backstage:

1. **react-component-patterns**: File organization, naming conventions, prop typing, composition patterns, export patterns
2. **react-hooks-patterns**: Standard hooks usage, custom hook naming, composition, rules enforcement, context integration
3. **backstage-plugin-components**: Plugin-specific component architecture, entity cards, plugin APIs, lazy loading, configuration
4. **backstage-reusable-components**: Core component library organization, API stability, theme integration, accessibility, documentation

These rules will be stored in `.opencode/rules/patterns/` and referenced in linter/prettier configurations and ESLint plugins to enable automated enforcement. Each rule document includes concrete scenarios and acceptance criteria that can be validated by tooling or code review.

## Risks / Trade-offs

- **Risk**: Rules may become outdated as React evolves → Mitigation: Establish a quarterly review cycle and version the rules
- **Risk**: Adoption resistance from teams with established patterns → Mitigation: Provide migration guidelines and gradual enforcement via linters
- **Trade-off**: Detailed rules may feel restrictive initially → Benefit: Consistency enables faster code review and better plugin interoperability
- **Risk**: Linter configuration lag → Mitigation: Document rules as ESLint/prettier configurations in parallel with rule authoring

## Migration Plan

1. **Phase 1 (Week 1-2)**: Write and review all four usage rule documents
2. **Phase 2 (Week 3-4)**: Create ESLint rules and prettier configurations to enforce patterns
3. **Phase 3 (Week 5-6)**: Update Backstage contributor guides and onboarding documentation
4. **Phase 4 (Week 7-8)**: Gradual enforcement on new code; offer migration guidance for existing plugins
5. **Phase 5 (Ongoing)**: Quarterly review and updates to rules based on community feedback

## Confirmation

How to verify this design is met:

- **Checklist**: All four rule documents exist with 5+ requirements each
- **Completeness**: Every rule has 2+ scenarios with concrete WHEN/THEN acceptance criteria
- **Integration**: ESLint and prettier configurations reference and enforce the rules
- **Accessibility**: Rules are accessible via Backstage docs and plugin development guides
- **Feedback**: Team lead approval of all rule documents before archiving change

## Open Questions

- Will we enforce these rules via a shared ESLint config or per-plugin configuration?
- Should we create Backstage linter plugins or rely on existing ESLint/prettier ecosystem?
- How do we version rules for backward compatibility with older plugins?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| n/a | — | n/a — no new technologies adopted | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| React usage rules | Plugin developers, code reviewers | `.opencode/skills/react-usage-patterns/SKILL.md` | create | New comprehensive patterns guide needed for developers implementing and reviewing React code |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated entities; usage rules are documentation-only |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
