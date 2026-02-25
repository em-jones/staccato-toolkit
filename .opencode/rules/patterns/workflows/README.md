# GitHub Actions Workflow Patterns

This directory contains usage rules and patterns for GitHub Actions workflows across the organization. All workflows MUST follow these patterns to ensure consistency, maintainability, security, and efficiency.

## Pattern Categories

### Workflow Design Patterns

See [`design.md`](./design.md) for patterns governing:

- Workflow structure and naming conventions
- Job organization and orchestration
- Step-level structure and naming
- Conditional execution patterns
- Environment variable and input management
- Error handling and failure strategies
- Workflow performance and efficiency
- Workflow documentation and comments

### Action Curation Patterns

See [`../actions/curation.md`](../actions/curation.md) for patterns governing:

- Action vetting criteria
- Action source and trust assessment
- Security scanning for actions
- Action documentation and clarity
- Action maintenance status tracking
- Curated action catalog
- Action version pinning strategies
- Deprecated action handling

### Secrets Management Patterns

See [`../actions/secrets.md`](../actions/secrets.md) for patterns governing:

- Secret definition and organization
- Secret access control and scoping
- Secret masking in logs
- Credential rotation and lifecycle management
- Preventing secrets in code
- Safe secret passing between steps
- Token and permission management
- External secret integration

### Reusable Workflows Patterns

See [`reusable.md`](./reusable.md) for patterns governing:

- Reusable workflow structure and composition
- Reusable workflow documentation and examples
- Input and output parameter validation
- Secrets passing to reusable workflows
- Reusable workflow versioning and stability
- Workflow reuse patterns and conventions
- Matrix strategies for reusable workflows
- Error handling and status reporting

## Quick Reference

### When creating a new workflow:

1. Review [`design.md`](./design.md) for workflow structure requirements
2. Check [`../actions/curation.md`](../actions/curation.md) for approved actions
3. Reference [`../actions/secrets.md`](../actions/secrets.md) for secrets handling
4. For reusable workflows, follow [`reusable.md`](./reusable.md)

### Example Workflows

Example workflows demonstrating best practices are available in the organization's shared workflows repository (link TBD).

## Compliance

All workflows must comply with these patterns. Violations should be:

1. Identified through code review and CI/CD validation
2. Reported to the platform team
3. Corrected in the next workflow update

## Evolution

These patterns are reviewed quarterly and updated based on GitHub Actions releases, security findings, and organizational feedback.
