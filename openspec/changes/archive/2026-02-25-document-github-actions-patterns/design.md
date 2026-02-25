---
td-board: document-github-actions-patterns
td-issue: td-44a1f7
---

# Design: Document GitHub Actions Patterns

## Context and problem statement

GitHub Actions workflows are widely used across the organization, but lack documented patterns, best practices, and organizational standards. This creates inconsistency in workflow design, redundant implementation efforts, security gaps in secrets handling, and difficulty onboarding new teams to workflow development. Currently, each project evolves workflows independently without shared guidance on action selection, step organization, or reusable workflow composition. This design establishes a comprehensive pattern library and usage rules for GitHub Actions development.

## Decision criteria

This design achieves:

- **Consistency**: All workflows follow established patterns for step organization, job orchestration, and error handling (weight 25%)
- **Security**: Secrets and credentials are handled safely with clear policies and automation (weight 30%)
- **Maintainability**: Workflows are well-documented, reusable, and easy to understand (weight 20%)
- **Scalability**: Reusable workflows enable code sharing and reduce duplication (weight 15%)
- **Discoverability**: Clear action curation and documentation enable developers to find and use approved tools (weight 10%)

Explicitly excludes:

- Implementation of GitHub Actions workflows in specific projects (captured in separate OpenSpec changes per project)
- Migration of existing non-compliant workflows (timing to be determined)
- GitHub-hosted runner customization or setup (distinct from workflow patterns)
- Deployment of external secret management systems beyond GitHub's native secrets (those are separate changes)

## Considered options

### Option 1: Minimal documentation in wiki/confluence

Create an informal documentation page with workflow examples and best practices, without formal usage rules or specifications.

**Rejected**: Insufficient for organizational enforcement, no clear accountability, difficult to keep synchronized with actual workflows, no mechanism to identify gaps or enforce patterns.

### Option 2: Comprehensive OpenSpec change with four capabilities

Create formal specifications for workflow design, action curation, secrets management, and reusable workflows. Each capability has clear requirements, scenarios, and linked tasks. Usage rules are created in `.opencode/rules/patterns/` with patterns indexed in a central README.

**Selected**: This approach enables structured implementation, clear requirement traceability, automated validation, and evolution over time. Specs create testable requirements; rules create enforceable patterns.

### Option 3: Single monolithic spec for all GitHub Actions patterns

Combine all four capabilities into one spec file without separation of concerns.

**Rejected**: Too broad to parallelize work, difficult to target fixes, unclear component ownership, harder to verify individual requirements.

## Decision outcome

Implement the comprehensive OpenSpec approach (Option 2) with four distinct capabilities:

1. **github-actions-workflow-design**: Specifies workflow structure, job orchestration, step composition, conditional execution, error handling, and documentation patterns.

2. **github-actions-action-curation**: Specifies action vetting criteria, source verification, security scanning, documentation standards, maintenance policies, and version pinning strategies.

3. **github-actions-secrets-management**: Specifies secret organization, access control, masking, rotation policies, and safe inter-step transmission.

4. **github-actions-reusable-workflows**: Specifies reusable workflow composition, parameter contracts, versioning, and composition patterns.

This decomposition allows parallel work, clear ownership by teams, incremental validation, and targeted fixes when patterns evolve.

## Implementation approach

### Artifacts and deliverables

**Specifications Phase**:
- Four spec files (one per capability) with requirements and scenarios
- Each requirement mapped to a task for implementation

**Design Phase**:
- Usage rules in `.opencode/rules/patterns/actions/` and `.opencode/rules/patterns/workflows/` directories
- Central `README.md` documenting patterns and linking to specifications
- Example workflows demonstrating recommended patterns
- Action curation catalog (either as a `.md` file or integrated into rules)

**Implementation Phase**:
- Create rules files with detailed pattern guidance
- Create workflow templates in organization-shared repositories
- Create documentation with examples and decision trees
- Create monitoring/validation where applicable (e.g., linting for secrets)

### Work organization

Each capability is a feature under the change root (td-44a1f7), with its own board:
- **Workflow Design Board** (td-1b66c3): 8 requirement tasks
- **Action Curation Board** (td-ea7df9): 8 requirement tasks
- **Secrets Management Board** (td-db42a9): 8 requirement tasks
- **Reusable Workflows Board** (td-c27815): 8 requirement tasks

Workers will implement requirements in parallel streams, creating rule files, documentation, and templates as needed.

### Cross-cutting tasks

The following tasks do not belong to individual specs but are needed for complete implementation:

1. **Create patterns/workflows/README.md**: Central index of all workflow patterns, linking to specs and rules
2. **Create pattern rule files**: Implementation of specific rules for each requirement
3. **Create example workflows**: Template workflows demonstrating recommended patterns
4. **Create action curation catalog**: Documented list of approved actions with evaluation criteria

These will be created as tasks under the change root during implementation.

## Risks and trade-offs

- **Risk**: Patterns become outdated as GitHub Actions evolves → **Mitigation**: Quarterly review cycle, version patterns, tie to GitHub Actions version
- **Risk**: Documentation is not discoverable by workflow authors → **Mitigation**: Link from every project's `.github/workflows/` directory README, reference in CI templates
- **Risk**: Security rules are too restrictive and developers circumvent them → **Mitigation**: Involve security and developer representatives in design, provide clear rationale
- **Trade-off**: Four separate specs mean more coordination effort, but enable parallel work and clearer requirements
- **Trade-off**: Comprehensive rules may feel prescriptive; balance between guidance and flexibility will require iteration

## Migration plan

### Phase 1: Documentation and rules (this change)
- Create specifications, usage rules, and documentation
- Establish action curation process

### Phase 2: Implementation in projects (separate changes per team)
- Teams adopt new patterns in their workflows
- Use pre-commit hooks and linting to enforce where possible

### Phase 3: Validation and evolution
- Monitor adoption, gather feedback
- Update patterns based on real-world usage

## Confirmation

How to verify this design is met:

- **Test cases**: Each spec requirement has scenarios that can be tested; rules are validated against actual workflows
- **Metrics**: Track number of workflows compliant with patterns, action curation adoption rate
- **Acceptance criteria**:
  - All four spec files created with requirements and scenarios
  - All rule files created under `.opencode/rules/patterns/`
  - Documentation in place with examples and decision trees
  - Action curation catalog created and accessible

## Open questions

- Should action curation catalog be a static markdown file or dynamic registry?
- How should we handle organization-internal vs. public GitHub Marketplace actions differently?
- What is the enforcement mechanism for workflow patterns (pre-commit hooks, branch protection, linting)?
- Should reusable workflows be stored in a separate org-wide repository or distributed?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| GitHub Actions workflow patterns | Workflow lead | `.opencode/rules/patterns/workflows/design.md` | pending |
| GitHub Actions action curation | Security/DevOps | `.opencode/rules/patterns/actions/curation.md` | pending |
| GitHub Actions secrets management | Security | `.opencode/rules/patterns/actions/secrets.md` | pending |
| GitHub Actions reusable workflows | Platform/DevOps | `.opencode/rules/patterns/workflows/reusable.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| GitHub Actions workflow patterns | Worker agents implementing spec requirements | `.opencode/skills/github-actions-patterns/SKILL.md` | create | Agents need guidance on how to create workflow patterns, translate requirements into rules, and implement examples. |
| — | — | — | none | — |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Catalog entities may emerge during implementation (e.g., a shared workflows repository) but are not declared at design time. |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| n/a | — | — | — | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
