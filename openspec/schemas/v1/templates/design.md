---
# These are optional metadata elements. Feel free to remove any of them.
status: "{proposed | rejected | accepted | deprecated | … | superseded by ADR-0123}"
date: { YYYY-MM-DD when the decision was last updated }
decision-makers: { list agents involved in the decision }
consulted:
  {
    list personas whose opinions are sought (typically subject-matter experts); and with whom there is a two-way communication,
  }
informed:
  {
    list personas who are kept up-to-date on progress; and with whom there is a one-way communication,
  }
# component: src/path/to/component  (repo-root-relative path; used to symlink design.md into the component's adr/ at archive time)
# Use a YAML list for multiple components:
# component:
#   - src/path/to/component-a
#   - src/path/to/component-b

# tech-radar: list of technology decisions for this change (source of truth for docs/tech-radar.json)
# Quadrant values: Infrastructure | Languages | Frameworks/Libraries | Patterns/Processes
# Ring values: Adopt | Trial | Assess | Hold
# moved: 1=moved in, -1=moved out, 0=unchanged (default)
# If no new technologies are adopted, omit this key or set to []
tech-radar: []
#  - name: example-technology
#    quadrant: Frameworks/Libraries
#    ring: Adopt
#    description: Brief rationale for ring assignment
#    moved: 1
---

# Design: [Change Title]

## Context and problem statement

{Describe the context and problem statement, e.g., in free form using two to three sentences or in the form of an illustrative story. You may want to articulate the problem in form of a question and add links to collaboration boards or issue management systems.}

## Decision criteria

This design achieves:

- [Goal 1]: [weight %]
- [Goal 2]: [weight %]

Explicitly excludes:

- [Out of scope 1]
- [Out of scope 2]

## Considered options

### Option 1: [Option Name]

[Description and why rejected]

### Option 2: [Option Name]

[Description and why rejected]

## Decision outcome

[Key technical choice and rationale. Why X over Y?]

## Risks / trade-offs

- Risk: [Description] → Mitigation: [Approach]
- Trade-off: [Description]

## Migration plan

[Steps to deploy and rollback strategy if applicable]

## Confirmation

How to verify this design is met:

- Test cases: [Description]
- Metrics: [What to measure]
- Acceptance criteria: [How to know it's done]

## Open questions

- [Question 1]
- [Question 2]

<!-- This is an optional element. Feel free to remove. -->

## Considered options

| Descision Criteria | Option 1 | Option 2 | Option 3 |
| ------------------ | -------- | -------- | -------- |
| [Criterion 1]      | [Score]  | [Score]  | [Score]  |
| [Criterion 2]      | [Score]  | [Score]  | [Score]  |
| [Criterion 3]      | [Score]  | [Score]  | [Score]  |

## Technology Adoption & Usage Rules

<!-- List technologies newly adopted by this change. For each, note the owning agent and whether a usage rule exists or needs to be created. -->
<!-- If no new technologies are adopted, use a single row with "n/a". -->
<!-- Status values: pending (rule needed), created (rule written this phase), reviewed (existing rule confirmed), validated (confirmed at verify), n/a -->

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Agent Skills

<!-- Evaluate whether this change requires agent skills to be created or updated. -->
<!-- A skill is needed when: a new technology is adopted that agents will use, a new workflow or process is introduced that agents must follow, or an existing skill no longer accurately describes agent behaviour after this change. -->
<!-- Action values: create (new skill needed), update (existing skill needs changes), none (no skill impact) -->
<!-- Skill paths: .opencode/skills/<skill-name>/SKILL.md -->

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | No agent-facing workflow changes introduced by this change |

## Catalog Entities

<!-- Declare which software catalog entities (Components, Systems, Domains, Groups) this change introduces or modifies. -->
<!-- For each entity, note the action and file path. Populated during design phase using the dev-portal-manager skill. -->
<!-- Kind values: Component, System, Domain, Group -->
<!-- Action values: create (write entity YAML to .entities/), existing (entity already exists), n/a (no entities) -->
<!-- Status values: declared (at design time), validated (confirmed at verify) -->

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated entities introduced by this change |

## TecDocs & ADRs

<!-- Document the TechDocs and ADR obligations for each component touched by this change. -->
<!-- For every Component in the Catalog Entities table above (create or existing), fill in this table. -->
<!-- If Catalog Entities is n/a, write n/a here too. -->
<!-- mkdocs.yml: path to the component's mkdocs.yml — create if absent -->
<!-- docs/adrs/: path to the ADR directory — create if absent -->
<!-- New docs pages: list any new documentation pages this change warrants (or "none") -->
<!-- Status values: pending (task created), done (scaffolding complete), n/a -->

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

<!-- Declare emergent prerequisite changes discovered during design. -->
<!-- Use this table when design decisions reveal that a separate change with its own artifact lineage is warranted — for example: selecting a third-party SDK, adopting a new infrastructure tool, or committing to a specific protocol that deserves dedicated analysis. -->
<!-- Each declared prerequisite will be spawned as an OpenSpec change (via `openspec new change <prereq-name>`) with a gate task created on this change to enforce completion ordering. -->
<!-- If no prerequisite changes are needed, use a single row with "n/a". -->
<!-- Status values: pending (not yet created), spawned (change directory created), complete (archived) -->

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
