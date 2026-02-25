# 0015. Adopt Dagger Pipeline-as-Code

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec CI/CD pipelines require building, testing, and deploying services across multiple environments. Traditional CI/CD platforms (GitHub Actions, GitLab CI) use YAML-based configuration that becomes complex and difficult to test locally.

Dagger provides:
- CI/CD pipelines defined in Go code (type-safe, testable)
- Portable execution (runs locally, in CI, or anywhere Docker runs)
- Reproducible builds with containerized execution
- Integration with existing CI platforms via simple YAML wrappers

Alternatives considered:
- **Pure GitHub Actions**: YAML-based, hard to test locally, vendor-specific
- **Makefiles**: Simple but lacks containerization and type safety
- **Bash scripts**: Flexible but error-prone and hard to maintain
- **Tekton**: Kubernetes-native but complex and YAML-heavy

## Decision

Adopt Dagger as the primary CI/CD automation framework for OpenSpec.

Pipelines must:
- Define build, test, and deploy logic in Go using Dagger SDK
- Execute locally for testing before pushing to CI
- Integrate with GitHub Actions via lightweight YAML wrappers
- Use Dagger modules for reusable pipeline components

## Consequences

**Easier:**
- Type-safe pipeline definitions with compile-time validation
- Test pipelines locally before pushing to CI
- Reusable pipeline components across projects
- Portable execution (local, CI, production)
- Reduced vendor lock-in (same code runs anywhere)

**Harder:**
- Requires Go knowledge for pipeline development
- Learning curve for Dagger concepts and SDK
- Dagger runtime must be installed locally and in CI
- Debugging containerized pipeline steps

**Maintenance implications:**
- Pipeline code must be maintained alongside application code
- Dagger modules must be versioned and tested
- CI runners must support Docker-in-Docker or Dagger Cloud
- GitHub Actions workflows become thin wrappers around Dagger
- Pipeline changes can be reviewed like application code

## Related Decisions

- ADR-0001: Adopt Go 1.23 for backend services
- ADR-0012: Adopt Docker containers for deployment
- ADR-0016: GitHub Actions for CI/CD workflows
- Usage rule: Dagger pipeline patterns (to be created)
