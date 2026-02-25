---
status: "proposed"
date: 2026-02-27
decision-makers: platform-team
consulted: staccato-server team
informed: all staccato-toolkit contributors
component:
  - src/staccato-toolkit/server

tech-radar:
  - name: OAM Application manifest pattern
    quadrant: Patterns/Processes
    ring: Adopt
    description: Canonical pattern for declaring Kubernetes workloads as OAM Applications — replaces raw Deployment YAML in source repos
    moved: 1
  - name: vela export (render pipeline)
    quadrant: Patterns/Processes
    ring: Trial
    description: CI step that renders OAM Application manifests to Kubernetes YAML using vela export; Trial pending full multi-env validation
    moved: 1
---

# Design: OAM Application Pattern

## Context and problem statement

`staccato-toolkit` services currently declare their Kubernetes workloads as raw `Deployment`, `Service`, and `ServiceMonitor` YAML in `src/ops/dev/manifests/`. This approach:
- Couples application teams to low-level Kubernetes API details (probe formats, label conventions, selector matching)
- Makes it impossible to enforce platform defaults (liveness probes, scrape labels, resource limits) without touching every file in every repo
- Produces no reusable abstraction boundary — every new service duplicates the same boilerplate

The `kubevela-component-definitions` change (Layer 0) registered `webservice`, `worker`, and `cron-task` `ComponentDefinition` CRDs. The `rendered-manifests-layout` change (Layer 0) established `staccato-manifests/<component>/<env>/k8s/` as the GitOps-managed destination for rendered outputs. This design defines how application teams author OAM `Application` manifests that use those definitions, and how `vela export` renders those manifests into the canonical layout.

## Decision criteria

This design achieves:

- **Platform control** (40%): Platform team enforces defaults (probes, labels, RBAC) via `ComponentDefinition` and `TraitDefinition` — application teams cannot drift
- **Developer ergonomics** (30%): Application teams write ~30 lines of intent-driven YAML instead of 150+ lines of raw Kubernetes
- **Auditability** (20%): Rendered outputs in `staccato-manifests` are deterministic, diffable, and GitOps-synced
- **Incremental adoption** (10%): Existing raw manifests remain valid during migration; OAM adoption is per-component

Explicitly excludes:

- Multi-cluster routing or traffic splitting (out of scope for this change; future trait)
- Secrets management via OAM traits (separate concern; handled by External Secrets Operator)
- KubeVela pipeline or workflow objects (not adopting vela pipelines at this time)

## Considered options

### Option A: OAM Application manifest per component (selected)

Application teams write a single `app.yaml` in their source directory. `vela export` renders it to Kubernetes YAML committed to `staccato-manifests`. Platform team owns `ComponentDefinition` and `TraitDefinition` CRDs.

**Why selected**: Clean separation between intent (app.yaml) and implementation (rendered YAML). Render step is explicit and auditable. Component definitions are platform-owned and versioned.

### Option B: Helm chart per component

Each component ships its own Helm chart with `values.yaml`. CI runs `helm template` to render manifests.

**Why rejected**: Helm charts re-introduce the same boilerplate problem — each chart author must know Kubernetes API details. No platform-managed constraint layer. KubeVela with ComponentDefinitions provides the abstraction Helm cannot.

### Option C: Continue with raw manifests

Keep `src/ops/dev/manifests/` as the source of truth, copy files to `staccato-manifests` via CI.

**Why rejected**: No abstraction boundary, no platform control layer, divergence across components is inevitable.

## Decision outcome

**Adopt Option A.** Each `staccato-toolkit` component SHALL declare its Kubernetes workload as an OAM `Application` manifest at `src/<component>/app.yaml`. CI renders this to `staccato-manifests/<component>/<env>/k8s/` via `vela export`. The `staccato-server` component is the reference implementation.

Key decisions:
- **Manifest location**: `src/<component-name>/app.yaml` (co-located with source, not in a separate ops directory)
- **Component type**: `webservice` for long-running HTTP servers (covers `staccato-server`)
- **Required traits**: `prometheus-scrape` for any component exposing `/metrics`; `ingress` for any component exposing HTTP endpoints
- **Render tool**: `vela export` (not `vela dry-run`) — produces static YAML suitable for GitOps
- **Render output**: Separate files per resource kind under `staccato-manifests/<component>/<env>/k8s/`

## Risks / trade-offs

- Risk: `vela export` output format changes across KubeVela versions → Mitigation: Pin KubeVela version in CI; diff rendered outputs in PR
- Risk: ComponentDefinition upgrades silently change rendered Deployment spec → Mitigation: Render pipeline must show a diff of changed lines in CI output; any diff requires manual approval on the `staccato-manifests` PR
- Trade-off: `app.yaml` is opaque to developers unfamiliar with OAM — they cannot infer the rendered Deployment shape → mitigated by `staccato-server-oam-example` as living documentation and by publishing rendered outputs in `staccato-manifests`
- Risk: Layer 0 prerequisite changes (`kubevela-component-definitions`, `kubevela-trait-definitions`, `rendered-manifests-layout`) are not complete → Mitigation: gate tasks created (see Prerequisite Changes)

## Migration plan

1. Complete Layer 0 prerequisites: `kubevela-component-definitions`, `kubevela-trait-definitions`, `rendered-manifests-layout`
2. Author `src/staccato-toolkit/server/app.yaml` using the `webservice` type with `prometheus-scrape` and `ingress` traits
3. Run `vela export` locally to validate rendered output matches intent from existing raw manifests
4. Commit rendered output to `staccato-manifests/staccato-server/dev/k8s/` via pull request
5. Update Flux `GitRepository` source to point to `staccato-manifests` (if not already done by `rendered-manifests-layout`)
6. Validate cluster state: pod `Running`, Prometheus target `UP`, Ingress resolves
7. Delete `src/ops/dev/manifests/staccato-server/` raw manifests from source repo

**Rollback**: Restore `src/ops/dev/manifests/staccato-server/` from git history and re-apply with `kubectl apply`.

## Confirmation

- `vela export` on `src/staccato-toolkit/server/app.yaml` produces `deployment.yaml`, `service.yaml`, `service-monitor.yaml`, `ingress.yaml` with correct field values
- `kubectl apply --dry-run=server` on all rendered files exits 0
- `kubectl get pods -n staccato` shows `staccato-server` as `Running` within 60s of Flux sync
- Prometheus targets page shows `staccato-server` as `UP`

## Open questions

- Should the `ingress` trait default to `staccato-server.local` for dev, or require explicit `domain` per env? (Recommendation: require explicit — avoids implicit env assumptions)
- `kubevela-trait-definitions` change is not yet archived — if it lands after this change starts, does the `prometheus-scrape` trait schema change? (Gate task created to block until `kubevela-trait-definitions` is archived)

---

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| OAM Application manifest authoring | platform-team | `docs/architecture/oam-application-manifest-rules.md` | pending |
| vela export render pipeline | platform-team | `docs/architecture/oam-render-pipeline-rules.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| OAM Application manifest authoring | worker agents implementing component workloads | `.opencode/skills/kubevela-application/SKILL.md` | create | No skill exists for authoring OAM Application manifests; agents need guidance on app.yaml structure, component types, and trait attachment |
| vela export render pipeline | worker agents running CI render steps | `.opencode/skills/kubevela-application/SKILL.md` | create | Same skill; render pipeline guidance co-located with authoring guidance |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | staccato-server | existing | platform-team | `.entities/component-staccato-server.yaml` | declared | Reference implementation component; entity already exists — no new entity needed |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| staccato-server | `src/staccato-toolkit/server/mkdocs.yml` | `src/staccato-toolkit/server/docs/adrs/` | `oam-application-pattern.md` (this ADR) | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| kubevela-component-definitions | `webservice` ComponentDefinition must be registered before app.yaml can reference `type: webservice` | spawned |
| kubevela-trait-definitions | `prometheus-scrape` and `ingress` TraitDefinitions must be registered before traits can be attached | spawned |
| rendered-manifests-layout | `staccato-manifests/<component>/<env>/k8s/` path schema must be established before rendered outputs are written | spawned |
