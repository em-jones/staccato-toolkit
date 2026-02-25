---
td-board: complete-skaffold-k9s-tools
td-issue: td-6857da
---

# Design: Complete Skaffold & k9s Tools Integration

## Context and problem statement

Skaffold and k9s were added to devbox but lack formal specification, usage rules, and integration documentation. Developers have these tools available but no clear guidance on workflows, configuration patterns, or best practices for local development. This design establishes how these tools integrate with devbox to provide a seamless, documented local development experience.

## Decision criteria

This design achieves:

- **Complete tool integration**: Skaffold and k9s fully available and documented in devbox
- **Usage clarity**: Clear patterns and rules for developers to follow
- **Workflow efficiency**: Seamless hot-reload and cluster debugging experience
- **Maintainability**: Documentation and rules prevent future incomplete integrations

Explicitly excludes:

- Production deployment automation (out of scope for local dev tools)
- Advanced Skaffold CLI features beyond dev mode
- Custom k9s plugins or theme customization

## Decision outcome

Both tools will be integrated as follows:

1. **Skaffold**: Configure in devbox with dev mode as primary workflow. Create usage rules documenting config templates, hot-reload patterns, and integration with k9s for monitoring.

2. **k9s**: Ensure kubeconfig resolution works seamlessly in devbox. Document cluster navigation patterns, log viewing, and interactive debugging scenarios alongside Skaffold dev workflows.

3. **Cross-cutting**: Both tools require documentation, usage rules under `.opencode/rules/patterns/`, and task specifications for implementation and rule creation.

## Risks / trade-offs

- Risk: Developers may have Skaffold/k9s configurations from other projects that conflict → Mitigation: Document clear devbox-specific setup and provide templates
- Trade-off: Comprehensive documentation adds overhead initially but prevents repeated support questions

## Migration plan

1. Verify Skaffold and k9s are in devbox.nix (devbox.json)
2. Create usage rules in `.opencode/rules/patterns/` for both tools
3. Create templates or example configs in documentation
4. Link from proposal.md and specs to created rules

## Confirmation

How to verify this design is met:

- Test cases: Developers can run `skaffold dev` and monitor with `k9s` in devbox
- Metrics: Usage rules exist and are linked from all capability specs
- Acceptance criteria: All implementation and documentation tasks closed

## Open questions

- Are there existing skaffold.yaml templates in the repo to reference or extend?
- Should k9s kubeconfig auto-detection be enhanced or are current devbox settings sufficient?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Skaffold local dev | developer | `.opencode/rules/patterns/development/skaffold-dev-workflow.md` | pending |
| k9s cluster navigation | developer | `.opencode/rules/patterns/development/k9s-cluster-debugging.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Skaffold dev workflow integration | worker | `.opencode/skills/skaffold-dev-workflow/SKILL.md` | create | New workflow introduced requiring worker guidance on configuration and execution |
| k9s cluster navigation | worker | `.opencode/skills/k9s-cluster-debugging/SKILL.md` | create | New debugging workflow requiring worker guidance on interactive cluster exploration |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated catalog entities required |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
