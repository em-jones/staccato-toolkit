---
td-board: flux-kustomization-wiring
td-issue: td-1b0064
status: "accepted"
date: 2026-02-27
decision-makers: [platform-architect-agent]
consulted: []
informed: []

tech-radar:
  - name: Flux v2 Kustomization CRD
    quadrant: Infrastructure
    ring: Adopt
    description: >
      Flux `Kustomization` objects drive the GitOps reconciliation loop from
      `staccato-manifests` into the cluster. Adopting as the standard wiring
      layer for all component deployments.
    moved: 1
---

# Design: Flux Kustomization Wiring

## Context and problem statement

Flux v2 is bootstrapped in the local `kind` cluster and reads from `staccato-manifests` (Layer 1
complete). The `staccato-manifests` repo has a canonical layout at `<component>/<env>/k8s/` (Layer 0
complete). However, the wiring layer — the `GitRepository` source object and per-component
`Kustomization` objects — does not yet exist. Until these objects are authored and committed to
`staccato-manifests/flux-system/`, Flux cannot reconcile any component manifests and the GitOps
loop is incomplete.

## Decision criteria

This design achieves:

- **End-to-end GitOps loop** (60%): Committing a manifest to `staccato-manifests/<component>/<env>/k8s/` automatically reconciles the cluster state within one interval.
- **Per-env isolation** (25%): Each environment's Kustomization targets only its own path; no cross-env contamination.
- **Observability** (15%): Health check failures are surfaced through Flux's readiness gates and `flux get kustomizations` output.

Explicitly excludes:

- HelmRelease wiring (covered by `flux-helm` capability in `flux-usage-rules`)
- Production cluster wiring (this change defines the convention; applying to production is an operational task)
- Automatic Kustomization generation for new components (a future CI task; this change hand-authors the initial set)

## Considered options

### Option A: One Kustomization per component (all envs)

Each component gets a single `Kustomization` that reconciles all environments. Rejected — Flux
paths are single-path; a single Kustomization cannot fan-out to multiple `<env>/k8s/` dirs.

### Option B: One Kustomization per component/env pair (chosen)

Each `<component>/<env>` pair gets its own `Kustomization` named `<env>-<component>`. This is the
standard Flux pattern and aligns with the `rendered-manifests-layout` path contract. Chosen.

### Option C: Kustomization-of-Kustomizations (umbrella)

An umbrella Kustomization in `flux-system` points at `flux-system/` which contains the wiring
Kustomizations. This is essentially what the bootstrap already does — the bootstrap
`Kustomization` self-manages `flux-system/`. Adding component Kustomizations to `flux-system/`
automatically brings them under the bootstrap's scope. Chosen as the storage strategy (no
additional umbrella needed).

## Decision outcome

**All wiring objects live in `staccato-manifests/flux-system/`** and are self-reconciled by the
bootstrap `Kustomization`. Each component/env pair has exactly one `Kustomization` named
`<env>-<component>` with `spec.path` pointing at `./<component>/<env>/k8s`. A single shared
`GitRepository` named `staccato-manifests` in `flux-system` serves as the `sourceRef` for all
component Kustomizations. Per-env URL variants are managed via Kustomize overlays within
`flux-system/` (base + `overlays/local/` and `overlays/prod/`).

## Risks / trade-offs

- Risk: `staccato-manifests/flux-system/` grows large as components are added → Mitigation: each component Kustomization is in its own file (`kustomization-<env>-<component>.yaml`); the root `kustomization.yaml` includes them via glob pattern.
- Risk: Secret for Gitea auth must be pre-provisioned → Mitigation: bootstrap task (`flux-local-bootstrap`) provisions the secret; this change documents the expected secret name.
- Trade-off: Hand-authoring initial Kustomizations is manual — acceptable for the initial set of staccato-toolkit components (staccato-server, staccato-cli); automation deferred.

## Migration plan

1. Add `staccato-manifests/flux-system/gitrepository.yaml` — shared `GitRepository` source.
2. Add per-env overlay structure: `flux-system/overlays/local/gitrepository-patch.yaml` with Gitea URL, `flux-system/overlays/prod/gitrepository-patch.yaml` with GitHub URL.
3. Add `kustomization-local-staccato-server.yaml` and `kustomization-local-staccato-cli.yaml` to `flux-system/`.
4. Update `flux-system/kustomization.yaml` to include all new files.
5. Push to `staccato-manifests`; Flux bootstrap will self-reconcile and apply the new objects.
6. Verify: `flux get kustomizations -A` should list `local-staccato-server` and `local-staccato-cli`.

Rollback: delete the wiring YAML files from `staccato-manifests/flux-system/` and push; Flux prune will remove the Kustomization objects from the cluster.

## Confirmation

- `flux get kustomizations -n flux-system` lists all expected `<env>-<component>` kustomizations with `Ready: True`
- `flux get sources git -n flux-system` shows `staccato-manifests` source with `Ready: True`
- Removing a manifest YAML from `staccato-manifests/<component>/local/k8s/` and pushing causes Flux to delete the corresponding resource within 1m

## Open questions

- Which additional components beyond `staccato-server` and `staccato-cli` need wiring at this layer? (Deferred — add as components are ready.)
- Should `targetNamespace` be hardcoded or patched per-env? (Decision: hardcode in each Kustomization file — namespaces are stable per component.)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Flux v2 Kustomization CRD | platform-architect-agent | `openspec/changes/flux-usage-rules/specs/flux-kustomizations/spec.md` | reviewed |
| Flux v2 GitRepository CRD | platform-architect-agent | `openspec/changes/flux-usage-rules/specs/flux-sources/spec.md` | reviewed |
| Kustomize overlay structure | platform-architect-agent | `openspec/changes/kustomize-usage-rules/` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Flux v2 Kustomization wiring | platform-architect-agent, worker agents | — | none | No new agent skill needed; wiring follows existing flux-usage-rules and rendered-manifests-layout conventions |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Flux wiring objects are Kubernetes resources, not catalog entities. No new Component, System, or Group is introduced by this change. |

## TecDocs & ADRs

n/a

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| flux-local-bootstrap | Flux controllers must be installed and the bootstrap Kustomization self-managing before wiring objects can be applied | spawned |
| flux-usage-rules | Kustomization and GitRepository authoring rules must be established | spawned |
| rendered-manifests-layout | `<component>/<env>/k8s/` path contract must be defined before `spec.path` can be set | spawned |
