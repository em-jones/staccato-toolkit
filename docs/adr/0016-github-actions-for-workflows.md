# 0016. GitHub Actions for CI/CD Workflows

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec is hosted on GitHub and requires CI/CD workflows for pull requests, releases, and deployments. We need a CI/CD platform that integrates natively with GitHub and supports custom automation.

GitHub Actions provides:
- Native GitHub integration (pull requests, issues, releases)
- Rich marketplace of reusable actions
- Matrix builds for testing across multiple versions
- Secrets management and environment protection
- Free tier for open-source projects

Alternatives considered:
- **GitLab CI**: Powerful but requires separate GitLab instance
- **CircleCI**: Feature-rich but external service with cost
- **Jenkins**: Flexible but requires self-hosting and maintenance
- **Buildkite**: Fast but requires agent management

## Decision

Adopt GitHub Actions as the primary CI/CD platform for OpenSpec.

Workflows must:
- Use Dagger for complex pipeline logic (see ADR-0015)
- Keep GitHub Actions YAML minimal (trigger Dagger pipelines)
- Use reusable workflows for common patterns
- Follow security best practices (pin action versions, minimal permissions)
- Implement branch protection rules requiring workflow success

## Consequences

**Easier:**
- Native integration with GitHub pull requests and issues
- No external CI/CD service to manage
- Rich ecosystem of community actions
- Free for open-source projects
- Built-in secrets management and OIDC support

**Harder:**
- YAML-based configuration can become complex
- Debugging requires pushing to GitHub (mitigated by Dagger)
- Runner limitations (execution time, disk space)
- Vendor lock-in to GitHub platform

**Maintenance implications:**
- Workflow YAML files must be maintained in `.github/workflows/`
- Actions must be pinned to specific versions (SHA or tag)
- Secrets must be managed in GitHub repository settings
- Reusable workflows should be extracted for common patterns
- Workflow logs must be reviewed for security and performance

## Related Decisions

- ADR-0015: Adopt Dagger for pipeline-as-code
- Usage rule: GitHub Actions workflow design patterns
- Usage rule: GitHub Actions secrets management
- Usage rule: GitHub Actions reusable workflows
