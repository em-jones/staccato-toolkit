---
td-board: progressive-delivery-strategy
td-issue: td-ab848e
status: proposed
date: 2026-02-27
decision-makers: platform-architect-agent
consulted: staccato-toolkit
informed: app-teams

component:
  - src/staccato-toolkit/server

tech-radar:
  - name: Flux CD
    quadrant: Infrastructure
    ring: Adopt
    description: GitOps reconciliation engine for staccato-manifests; drives rollout lifecycle via Kustomization health checks.
    moved: 1
  - name: Progressive Delivery (canary + blue-green)
    quadrant: Patterns/Processes
    ring: Trial
    description: Weight-based canary and atomic blue-green deployment patterns expressed as OAM traits; trialing before full platform adoption.
    moved: 1
---

# Design: Progressive Delivery Strategy

## Context and problem statement

Staccato services are deployed atomically — a new image tag replaces the running pods with no traffic splitting or staged rollout. A bad deployment affects 100% of traffic immediately with no automated rollback. App teams need canary and blue-green patterns that are GitOps-managed via Flux, expressed as OAM traits on their KubeVela `Application`, with health-gated promotion and automatic rollback. This design establishes the platform-level `TraitDefinition` resources and the Flux wiring that drives the rollout lifecycle from `staccato-manifests`.

## Decision criteria

This design achieves:

- **Safety**: 80% — traffic splitting and rollback prevent bad deployments from reaching all users.
- **GitOps consistency**: 10% — rollout configuration lives in `staccato-manifests`, not in ad-hoc scripts.
- **App-team ergonomics**: 10% — app teams declare a single trait on their component; platform handles mechanics.

Explicitly excludes:

- Service mesh traffic management (Istio/Linkerd) — KubeVela rollout traits use native Kubernetes Service selector and weight annotations; no service mesh dependency.
- Multi-cluster progressive delivery — all rollout happens within a single cluster.
- Automated canary analysis via external metrics (Flagger-style) — weight promotion uses simple health probe success, not error-rate SLOs.

## Considered options

### Option 1: Flagger standalone controller

Flagger is purpose-built for canary and blue-green delivery and supports automatic metric-based analysis. However, it is a separate controller with its own CRD surface, requires a service mesh or Ingress controller for traffic splitting, and does not integrate with the OAM Application model already adopted by the platform. App teams would need to learn Flagger CRDs in addition to OAM Application manifests.

**Rejected**: Adds a second deployment model parallel to KubeVela; breaks OAM-centric platform design.

### Option 2: Argo Rollouts

Argo Rollouts provides rich canary and blue-green strategies with analysis templates. It is widely adopted but introduces a new CRD layer (`Rollout` replaces `Deployment`) that is incompatible with the OAM `Application` model. KubeVela components must render to standard Kubernetes resources; wrapping them in Argo Rollout objects would require custom `ComponentDefinition` overrides.

**Rejected**: Incompatible with OAM Application rendering pipeline; too much customisation required.

### Option 3: KubeVela rollout TraitDefinition (chosen)

KubeVela supports custom `TraitDefinition` CRDs that can express rollout behaviour as traits attached to OAM components. The platform team authors the `TraitDefinition`; app teams add a `rollout` trait to their existing OAM `Application`. Flux health checks on the `Kustomization` gate promotion by watching `Application` status conditions.

**Selected**: Native to the OAM platform model, no additional controllers, Flux-compatible.

## Decision outcome

Two `TraitDefinition` resources will be authored by the platform team:

1. **`canary-rollout`** — maintains stable + canary Deployments; uses a weighted Service backend (or Ingress weight annotation) to split traffic. The trait controller promotes weight on health-probe success and rolls back on repeated failure.
2. **`blue-green-rollout`** — maintains blue + green Deployment slots; switches the Kubernetes Service selector atomically when `activeSlot` changes.

Both traits are declared in `staccato-manifests` as part of the OAM `Application` for a given service. Flux reconciles the `Application` and its health checks gate the `Kustomization` status.

`staccato-server` is the reference implementation — its manifests in `staccato-manifests` include both a canary and a blue-green example OAM Application.

## Risks / trade-offs

- **Risk**: KubeVela TraitDefinition CUE authoring is complex → Mitigation: Start with a simple CUE template that delegates to a Deployment patch; document usage rule before implementation.
- **Risk**: Flux health check for custom CRD status requires `healthChecks` stanza pointing to Application conditions → Mitigation: Create explicit `healthChecks` entry in the `staccato-manifests` Kustomization.
- **Trade-off**: Weight-based canary splitting requires either Ingress controller support or a sidecar; native Service splitting is not supported at L7. For initial trial, use replica-ratio-based splitting (canary replicas as fraction of total) rather than true L7 weight.
- **Risk**: Blue-green requires both slots to be running simultaneously, doubling resource cost → Mitigation: Document resource budget expectations in the blue-green usage rule; default standby slot to minimum replicas.

## Migration plan

1. Platform team authors `canary-rollout` and `blue-green-rollout` TraitDefinitions and applies them to the cluster.
2. Add Flux `healthChecks` stanza to the `staccato-manifests` Kustomization targeting OAM Application status.
3. Add `staccato-server` canary and blue-green example manifests to `staccato-manifests`.
4. Validate end-to-end: push a new image tag, observe weight promotion, verify rollback on simulated failure.
5. Publish usage rules for both traits so app teams can adopt the pattern.

Rollback: Remove the trait from the OAM `Application` spec. KubeVela will drop the extra Deployment slots and return to a standard single-Deployment component. No data migration required.

## Confirmation

- Both TraitDefinitions install without validation errors on a kind cluster with KubeVela.
- `staccato-server` canary example: weight advances from 10 → 30 → 50 → 70 → 90 → 100 across 5 observation windows.
- `staccato-server` blue-green example: `activeSlot` switch completes within one reconciliation cycle with zero pod restarts on the prior active slot.
- Flux `Kustomization` reaches `Ready` only after rollout completes; transitions to `Failed` on simulated rollback.

## Open questions

- Which L7 mechanism to use for canary traffic splitting in the absence of a service mesh? (Ingress annotation vs. replica-ratio). Needs decision before canary TraitDefinition authoring.
- Should the trait controller be an in-tree KubeVela controller or a standalone operator? (Lean toward in-tree CUE template for simplicity.)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| infrastructure/flux-gitops | platform-architect-agent | `openspec/specs/flux-kustomization-wiring/spec.md` | pending |
| infrastructure/kubevela-traitdefinition | platform-architect-agent | `openspec/specs/kubevela-trait-definitions/spec.md` | pending |
| patterns/progressive-delivery | platform-architect-agent | `openspec/specs/progressive-delivery-strategy/spec.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Flux GitOps rollout lifecycle | devops-automation, development-orchestrator | `.opencode/skills/devops-automation/SKILL.md` | update | Skill must document Flux health check patterns for OAM Application rollout |
| KubeVela TraitDefinition authoring | development-orchestrator | `.opencode/skills/dev-portal-manager/SKILL.md` | none | No agent-facing workflow change; existing KubeVela skill covers component authoring |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | staccato-server | existing | staccato-toolkit | `src/staccato-toolkit/server/catalog-info.yaml` | declared | staccato-server is the reference implementation component |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| staccato-server | `src/staccato-toolkit/server/mkdocs.yml` | `src/staccato-toolkit/server/docs/adrs/` | Progressive Delivery Strategy (this ADR) | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| flux-kustomization-wiring | Flux Kustomization health check patterns are referenced but no spec or usage rule exists. This change must be authored before the progressive-delivery-flux-integration requirements can be implemented. | complete |
| kubevela-trait-definitions | KubeVela TraitDefinition CRD and authoring patterns are referenced but the existing `kubevela-adoption-rationale` spec only documents rationale, not usage. A dedicated spec is needed. | complete |
