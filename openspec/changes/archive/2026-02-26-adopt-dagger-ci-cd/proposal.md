---
td-board: adopt-dagger-ci-cd
td-issue: td-13b830
---

# Proposal: Adopt Dagger CI/CD — Architecture & Usage Rules

## Why

The Dagger CI/CD platform (v0.19.11 + Go SDK) is actively used in src/ops/workloads/ but has no documented architecture decisions, usage patterns, or platform adoption rules. This creates friction for developers adding new pipeline tasks, no clear guidance on when to extend vs. refactor modules, and no record of critical orchestration decisions (container caching, module layout, multi-module coordination). Documenting this pattern now establishes the foundation for scaling CI/CD tooling and ensures consistent contribution practices.

## What Changes

- **Document Dagger module architecture decision** and rationale for Go SDK + container-based execution model
- **Define usage rules** for pipeline task implementation, naming conventions, source mounting, and container image selection
- **Design platform pattern for Dagger CI/CD** covering module organization, function signatures, caching strategy, and cross-module orchestration
- **Catalog Dagger adoption** in the tech radar and platform patterns directory

## Capabilities

### New Capabilities

- `dagger-module-architecture`: Document the Dagger module's role in the platform, design rationale (GraphQL-driven, container isolation), and core components (Platform type, exported functions).
- `dagger-pipeline-usage-rules`: Define rules for writing new pipeline tasks (function naming, parameter patterns, exit behavior, container base image strategy, mount points).
- `dagger-ci-cd-platform-pattern`: Design the cross-cutting pattern for Dagger CI/CD orchestration (multi-stage pipelines, caching layers, secrets handling, local vs. CI execution differences).

### Modified Capabilities

None — this is documentation of existing, undocumented code.

## Impact

- **Modules affected**: src/ops/workloads/ (Dagger module), .github/workflows/ci.yml (CI pipeline consumer)
- **API changes**: None (documentation only)
- **Data model changes**: None
- **Dependencies**: Dagger v0.19.11 (already in use); no new dependencies introduced
- **Patterns affected**: Establishes canonical rules at `.opencode/rules/patterns/delivery/dagger-ci-cd.md` and platform pattern for devops automation

