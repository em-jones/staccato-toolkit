---
td-board: adopt-dagger-ci-cd
td-issue: td-2408ce
status: proposed
date: 2026-02-25
decision-makers:
  - Platform Architect
  - DevOps Lead
consulted:
  - Development Team
  - CI/CD Contributors
informed:
  - All Contributors
tech-radar:
  - name: dagger
    quadrant: Infrastructure
    ring: Adopt
    description: GraphQL-driven CI/CD framework for containerized pipeline orchestration. Chosen for container isolation, language-agnostic task composition, and efficient caching strategy.
    moved: 1
---

# Design: Adopt Dagger CI/CD — Architecture & Usage Rules

## Context and Problem Statement

The Dagger CI/CD platform (v0.19.11 with Go SDK) is actively used in `src/ops/workloads/` but is entirely undocumented from an architectural and adoption perspective. Developers adding new pipeline tasks have no guidance on:

1. **Why Dagger?** What is the rationale for the container-based, GraphQL-driven approach?
2. **How to extend?** What naming conventions, function signatures, and patterns should new tasks follow?
3. **How does it scale?** How do multi-stage pipelines, caching, secrets, and local vs. CI differences work?

This lack of documentation creates friction, inconsistent contributions, and limits the module's effectiveness as the platform's CI/CD backbone.

## Decision Criteria

This design achieves:

- **Single Source of Truth** (40%): Canonical documentation and rules so all contributors follow the same patterns
- **Developer Experience** (30%): Clear guidance on writing new tasks without research or cargo-culting
- **Platform Scalability** (20%): Established patterns for multi-task orchestration, caching, and secrets handling
- **Architectural Clarity** (10%): Clear rationale for core design decisions (SDK, container isolation, module layout)

Explicitly excludes:

- Implementation of new tasks or modules beyond documentation
- Migration of existing CI/CD systems to Dagger (already in place)
- Performance optimization or caching tuning (documented as future work)

## Considered Options

### Option 1: Minimal Documentation (Code Comments Only)

**Description**: Document only in code comments and README.md in src/ops/workloads/docs/.

**Why rejected**: Does not integrate with OpenSpec patterns system, cannot be enforced via usage rules, no clear governance for extensions.

### Option 2: OpenSpec Adoption + Platform Patterns (Selected)

**Description**: Full specification (3 capabilities), canonical platform pattern rule, and td task hierarchy for rule creation and documentation.

**Why selected**: 
- Integrates architecture decisions into the patterns system for governance
- Creates enforceable usage rules via `.opencode/rules/patterns/delivery/dagger-ci-cd.md`
- Establishes a clear approval and contribution process
- Documented rationale supports future architects and maintainers

### Option 3: External Dagger Best Practices Reference

**Description**: Link to upstream Dagger documentation and best practices without internal adaptation.

**Why rejected**: Does not account for platform-specific needs (Go toolchain, GitHub Actions integration, secret handling strategy), creates confusion about what applies to this repository.

## Decision Outcome

**Adopt Dagger CI/CD formally within OpenSpec** with three capabilities and a canonical platform pattern rule:

1. **dagger-module-architecture**: Document the Go SDK choice, container isolation model, caching strategy, and GraphQL orchestration approach.
2. **dagger-pipeline-usage-rules**: Define naming conventions, function signatures, parameter patterns, exit behavior, and container base image selection.
3. **dagger-ci-cd-platform-pattern**: Define multi-stage pipeline orchestration, local vs. CI execution differences, secrets handling, and module organization.

**Platform pattern rule**: Create `.opencode/rules/patterns/delivery/dagger-ci-cd.md` as the canonical source for developers adding new tasks. This rule SHALL be referenced by all task requirements and SHALL document:
- Why Dagger was chosen (container isolation, GraphQL composition, caching efficiency)
- Module structure and SDK rationale
- Task naming and function signature conventions
- Caching strategy and layer management
- Secrets handling in local vs. CI contexts
- Examples of lint, test, build, and shell-check tasks
- Multi-stage pipeline orchestration patterns

## Risks / Trade-offs

**Risk**: Dagger version upgrades (currently v0.19.11) may break task implementations or require refactoring.

→ **Mitigation**: Version is pinned in `dagger.json`. Platform pattern rule includes guidance on version upgrade testing and staging.

**Trade-off**: Container isolation adds overhead vs. native tools (e.g., direct golangci-lint invocation).

→ **Justification**: Overhead is acceptable for reproducibility, portability, and consistency between local and CI execution.

**Risk**: Developers unfamiliar with Dagger or GraphQL may find the learning curve steep.

→ **Mitigation**: Platform pattern rule includes step-by-step task authoring examples. Usage rules provide copy-paste templates for common patterns.

**Trade-off**: Caching strategy is implicit (Dagger handles it), making performance debugging less transparent.

→ **Justification**: Documented in platform pattern. Teams can profile cache hit rates via `dagger query` and GitHub Actions cache metrics.

## Migration Plan

1. **Phase 1 (This Change)**: Create OpenSpec specifications and platform pattern rule draft.
2. **Phase 2 (Implementation tasks)**: Implement canonical pattern rule at `.opencode/rules/patterns/delivery/dagger-ci-cd.md`.
3. **Phase 3 (Verification)**: Link existing tasks in `src/ops/workloads/` to pattern requirements, validate against spec scenarios.
4. **Phase 4 (Rollout)**: Publish pattern rule and specifications. Future task contributions SHALL reference the pattern and spec.

**No breaking changes** — existing Dagger module and tasks remain as-is during and after this change.

## Confirmation

How to verify this design is met:

- **Specifications complete**: All three specs (architecture, usage rules, platform pattern) are written and linked to td issues
- **Pattern rule drafted**: `.opencode/rules/patterns/delivery/dagger-ci-cd.md` exists with sections for all key design decisions
- **Task hierarchy created**: Each spec has associated requirement tasks linked to td board
- **Examples present**: Platform pattern rule includes code examples for `Lint`, `Test`, `Build`, and `Shellcheck` tasks
- **Cross-references**: Specs link to existing source code (main.go, dagger.json) and platform pattern rule links to all specs

## Open Questions

- Should the platform pattern rule recommend a "task factory" helper function for common patterns (container setup, mount, exec)? Currently deferred.
- Should CI caching strategy (GitHub Actions vs. Dagger's internal cache) be documented separately or as part of this pattern? Currently part of platform pattern.
- Are there other Dagger features (secrets, directives, modules composition) that need documenting beyond the three capabilities? Deferred to future change if needed.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Dagger CI/CD | DevOps Architect | `.opencode/rules/patterns/delivery/dagger-ci-cd.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Dagger CI/CD platform authoring | devops-automation skill user, worker agents | `.opencode/skills/devops-automation/SKILL.md` | update | Existing skill must document how to author new Dagger tasks using the platform pattern rule |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | Platform Workloads (Dagger) | existing | DevOps | `src/ops/workloads/` | declared | Existing Dagger module; this change documents its architecture and patterns |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| Platform Workloads | `src/ops/workloads/mkdocs.yml` | `src/ops/workloads/docs/` | `Architecture Decisions.md`, `Task Authoring Guide.md` | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | Dagger is already adopted and pinned at v0.19.11; no upstream adoption decisions needed | — |

