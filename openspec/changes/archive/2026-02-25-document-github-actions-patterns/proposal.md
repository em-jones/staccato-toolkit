---
td-board: document-github-actions-patterns
td-issue: td-44a1f7
---

# Proposal: Document GitHub Actions Patterns

## Why

GitHub Actions workflows are in active use across the organization but lack documented patterns, best practices, and curated action selection criteria. This creates inconsistency in workflow design, inefficient action adoption, and difficulty onboarding teams to workflow authoring. Establishing clear usage rules and patterns reduces technical debt and accelerates workflow development.

## What Changes

- Create GitHub Actions workflow design usage rules covering step organization, job orchestration, and conditional execution
- Document action curation and selection criteria with a vetted action catalog
- Establish secrets management patterns for secure credential handling in workflows
- Define reusable workflow patterns for common CI/CD scenarios
- Create design guidelines for workflow performance and maintainability

## Capabilities

### New Capabilities

- `github-actions-workflow-design`: Workflow structure, step composition, job orchestration patterns
- `github-actions-action-curation`: Action selection criteria, vetting process, approved action catalog
- `github-actions-secrets-management`: Secrets handling, environment variable patterns, credential rotation
- `github-actions-reusable-workflows`: Reusable workflow composition, parameter passing, workflow composition patterns

### Modified Capabilities

None.

## Impact

- Affected services/modules: All projects using GitHub Actions workflows (most services in the organization)
- API changes: No
- Data model changes: No
- Dependencies: Potentially new usage rules in `.opencode/rules/patterns/` directory; new workflow templates in shared repos
