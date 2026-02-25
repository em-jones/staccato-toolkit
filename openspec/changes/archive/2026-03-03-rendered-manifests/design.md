---
td-board: rendered-manifests
td-issue: td-5bd989
status: "accepted"
date: 2026-03-03
decision-makers: [platform-architect-agent]
consulted: []
informed: [platform-team]

tech-radar:
  - name: dagger
    quadrant: Platforms
    ring: Adopt
    description: Existing CI/CD platform extended with Render and PublishModule tasks
    moved: 0
  - name: vela export (render pipeline)
    quadrant: Patterns/Processes
    ring: Trial
    description: KubeVela OAM Application rendering step driven from Dagger
    moved: 0
  - name: Harbor
    quadrant: Infrastructure
    ring: Adopt
    description: OCI registry receiving pushed rendered manifests via flux push artifact
    moved: 0
---

# Design: Rendered Manifests — Dagger Module

## Context and problem statement

The platform has OAM `Application` manifests and KubeVela component definitions in place. The
prior design wrote rendered manifests to a `staccato-manifests` git directory and opened GitHub
PRs. The GitOps provider change (`gitops-provider-component`) established that the canonical
delivery path is **OCI artifact → Harbor → Flux OCIRepository**, not git PR. This design updates
the `Render` task to push rendered YAML as OCI artifacts to Harbor via `flux push artifact`, and
adds a `RegistryService` helper for local Dagger testing.

## Goals / Non-Goals

**Goals:**
- `Render` pushes rendered manifests as OCI artifacts to Harbor (or any OCI Distribution Spec registry)
- `RegistryService` starts an in-process `registry:2` Dagger service for local development tests
- `dagger call render --env local --registry-url oci://harbor:5000/...` works without external infra when `RegistryService` is bound
- `PublishModule` pushes the module itself to Daggerverse

**Non-Goals:**
- Multi-environment promotion (dev → staging → prod) — separate concern
- Flux OCIRepository wiring — owned by `gitops-provider-component`
- Harbor provisioning — owned by the `harbor` KubeVela addon

## Decisions

### Decision 1: OCI push replaces git directory write

**Options:**
- A: Write rendered YAML to a `*Directory`, caller exports / opens PR (original design)
- B: Push to OCI registry directly from within `Render` via `flux push artifact`

**Selected: Option B.**
The `gitops-provider-component` change established Harbor OCI as the canonical GitOps source.
Writing to a git directory is no longer the platform delivery model. `flux push artifact` is
already used in the `staccato bootstrap oci-seed` CLI — reusing the same push mechanism is
consistent and operationally familiar.

### Decision 2: `flux push artifact` over `skopeo copy` or raw OCI client

`flux push artifact` embeds provenance metadata (`--source`, `--revision`) that Flux
`OCIRepository` verifies. A raw OCI push via `skopeo` or `oci-copy` would produce artifacts
without the Flux-expected annotations. Using `flux push artifact` keeps the producer and consumer
on the same contract.

### Decision 3: OCI artifact URL pattern: `<registryURL>/<component>:<env>-<sha>`

Separating components into sub-paths under the base URL (e.g.,
`oci://harbor-host/staccato/manifests/server:local-abc1234`) allows Flux to create one
`OCIRepository` per component without overlapping tags. This matches how `gitops-provider-component`
wires Flux OCIRepository sources.

### Decision 4: `RegistryService` uses `registry:2`, not the full Harbor stack

Harbor's full deployment requires multiple containers (core, jobservice, database, redis, etc.)
which is impractical as a Dagger sidecar. `docker.io/library/registry:2` (Docker Distribution v2)
is OCI Distribution Spec compliant, compatible with `flux push artifact`, and starts in under
one second. It is sufficient for testing the push/pull contract.

The service alias is `harbor` (matching the production cluster DNS pattern) so that test
`registryURL` values like `oci://harbor:5000/test/manifests` require no change to move from
test to production substitution.

### Decision 5: `registryCredentials` is a Docker config JSON secret

`flux push artifact` (and Flux generally) reads Docker credentials from `DOCKER_CONFIG` or
`~/.docker/config.json`. Passing a `*Secret` containing the JSON and injecting it as
`DOCKER_CONFIG` is the standard Dagger pattern for registry auth. Optional for the local
`RegistryService` (unauthenticated).

## Risks / Trade-offs

- **Risk**: `flux push artifact` requires `--source` and `--revision` — if git history is
  unavailable in the source directory, these cannot be populated → **Mitigation**: CI always
  has git history; local runs require a git-initialised checkout (not bare clone)
- **Risk**: `registry:2` doesn't implement Harbor's project/robot-account model → **Mitigation**:
  this is intentional for the test surface; credential validation is a CI concern, not a unit
  concern
- **Trade-off**: Sequential component pushes (not parallel) — simpler error propagation and avoids
  rate-limit issues against real Harbor in CI

## Migration Plan

1. Rewrite `Render` in `src/ops/workloads/render.go` with new signature
2. Add `RegistryService()` to `src/ops/workloads/harbor.go`
3. Update `dagger.gen.go` stub with `AsService`, `WithServiceBinding`
4. Update `platform_test.go` with `TestRenderOCIURL` and `TestRegistryService_Sentinel`
5. Remove `PublishModule` CI workflow step reference to git PR model (no longer needed)

**Rollback**: Revert `render.go`. No state is mutated in the cluster.

## Open Questions

- Should `Render` push components in parallel (one goroutine per component) to improve speed?
  → Deferred: sequential is simpler and correct; parallelism can be added once the path is stable
- Should `RegistryService` expose an option to persist data across Dagger runs? → No: ephemeral
  by design; persistent state is Harbor's job

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| dagger | platform-architect-agent | `.opencode/rules/patterns/delivery/dagger-ci-cd.md` | exists |
| Harbor (OCI push) | platform-architect-agent | n/a | no rule yet |
| vela export (render pipeline) | platform-architect-agent | n/a | trial |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Dagger Render task (OCI) | devops-automation agents | `.opencode/skills/devops-automation/SKILL.md` | update | Render pushes to OCI; RegistryService available for local tests |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | devops-workloads | existing | platform-team | `.entities/component-devops-workloads.yaml` | declared | New Render (OCI) and RegistryService added to existing Platform module |

## TechDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| devops-workloads | `src/ops/workloads/mkdocs.yml` | `src/ops/workloads/docs/adrs/` | `docs/render-task.md` | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| gitops-provider-component | Establishes Harbor OCI as the GitOps source; Render writes to it | archived |
| kubevela-component-definitions | Component types that OAM Applications reference | archived |
| oam-application-pattern | Defines vela export as the canonical render step | archived |
| adopt-dagger-ci-cd | Dagger module conventions this change extends | archived |
