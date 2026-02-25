---
status: "accepted"
date: 2026-02-27
decision-makers: [platform-architect]
consulted: [platform-team]
informed: [application-teams]

component: src/ops/kubevela/trait-definitions

tech-radar: []
# KubeVela and OAM are already on the radar (Trial / Adopt respectively).
# This change introduces no net-new technologies — TraitDefinitions are
# a first-class KubeVela/OAM primitive within the already-adopted stack.

td-board: kubevela-trait-definitions
td-issue: td-f8fd0b
---

# Design: KubeVela Trait Definitions

## Context and problem statement

KubeVela ComponentDefinitions (`kubevela-component-definitions`) give application teams a way to declare workload intent (`type: webservice`, `type: worker`, etc.) in OAM `Application` manifests. However, cross-cutting operational behaviours — ingress routing, autoscaling, Prometheus scraping, secret injection — are not composable from OAM today. Teams must either embed raw Kubernetes YAML in their applications or manage these concerns outside the OAM abstraction, which fragments platform standards and increases cognitive load. KubeVela's `TraitDefinition` CRD provides the composability primitive to solve this: each trait encodes a platform-managed behaviour that any team can attach to any component with a few YAML lines.

## Decision criteria

This design achieves:

- **Composability**: Any trait attaches to any component type without forking definitions — 100%
- **Platform ownership**: All trait YAML is authored and maintained by the platform team, not application teams — 100%
- **Minimal blast radius**: Each trait is independent; a bug in `autoscaler` does not affect `ingress` — 100%

Explicitly excludes:

- Application-specific trait variants (teams may not fork trait definitions)
- Cluster-wide trait enforcement / policy (out of scope for this change)
- Helm-based trait delivery (Kustomize pattern already established by ComponentDefinitions)

## Considered options

### Option 1: One monolithic TraitDefinition per concern expressed as raw Kubernetes patches

Author a single `TraitDefinition` that accepts a large parameter object and conditionally renders all four concerns (ingress, autoscaler, ServiceMonitor, envFrom) depending on flags. This avoids multiple manifest files.

**Rejected**: A single monolithic definition couples unrelated concerns, making the CUE template hard to read and extending blast radius to all traits on any CUE syntax error.

### Option 2: One TraitDefinition YAML per concern (chosen)

Each operational behaviour is a separate YAML file and a separate KubeVela `TraitDefinition` resource. Teams compose them by listing multiple entries under `traits:` in their OAM `Application`.

**Chosen**: Aligns with KubeVela's design intent (traits are composable units), matches the ComponentDefinitions pattern established in `kubevela-component-definitions`, and isolates blast radius per trait.

### Option 3: Helm chart for trait definitions

Package the four trait YAMLs as a Helm chart with a single `values.yaml`.

**Rejected**: Introduces a new delivery mechanism for a set of static CRD manifests that never need templating. Kustomize (already established) is sufficient and consistent with ComponentDefinitions delivery.

## Decision outcome

Four independent `TraitDefinition` YAML files, each stored at `src/ops/kubevela/trait-definitions/<name>.yaml`, applied to the cluster via the existing Kustomize pattern alongside ComponentDefinitions. CUE templates within each definition generate the corresponding Kubernetes resources at OAM render time.

| Trait | Generated K8s resources |
|---|---|
| `ingress` | `Service` (ClusterIP) + `Ingress` |
| `autoscaler` | `HorizontalPodAutoscaler` (autoscaling/v2) |
| `prometheus-scrape` | `ServiceMonitor` (monitoring.coreos.com/v1) |
| `env-from-secret` | patches `envFrom` on component containers |

## Risks / trade-offs

- Risk: CUE template errors silently fail at OAM render time → Mitigation: validate each trait locally with `vela def vet` before committing
- Risk: `prometheus-scrape` generates a `ServiceMonitor` that Prometheus cannot discover if label conventions differ → Mitigation: follow `servicemonitor-definition` and `servicemonitor-label-conventions` specs; cross-reference `servicemonitor-scrape-config` pattern
- Risk: `env-from-secret` `envFrom` patch semantics differ between KubeVela versions → Mitigation: pin KubeVela helm chart version; verify with integration test against local cluster
- Trade-off: `env-from-secret` injects all keys via `envFrom` (no per-key mapping in v1); teams needing key aliasing must inject individual vars manually

## Migration plan

1. Ensure `kubevela-component-definitions` change is applied (prerequisite)
2. Create `src/ops/kubevela/trait-definitions/` directory
3. Author four YAML manifests following the CUE templates defined per capability spec
4. Add the directory to the Kustomize overlay that applies ComponentDefinitions
5. Apply to local kind cluster: `kubectl apply -k src/ops/kubevela/trait-definitions/`
6. Smoke-test each trait with a minimal OAM Application on the local cluster
7. Document trait usage in the platform runbook (mkdocs page)

**Rollback**: `kubectl delete traitdefinition ingress autoscaler prometheus-scrape env-from-secret -n vela-system`; existing Applications using these traits will fail to reconcile until the definitions are restored.

## Confirmation

- `kubectl get traitdefinition -n vela-system` lists all four definitions
- `vela def vet src/ops/kubevela/trait-definitions/*.yaml` passes without errors
- Smoke test OAM Application with each trait attached: `vela status <app>` reports healthy
- `prometheus-scrape` trait: Prometheus scrapes the component metrics endpoint (verified via Grafana or `kubectl port-forward`)

## Open questions

- Should `ingress` default to a specific IngressClass (e.g., nginx)? Currently left as cluster default — revisit if multi-ingress-controller setup is needed.
- Should `autoscaler` support memory-based scaling in addition to CPU? Deferred to a follow-on trait update.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| KubeVela TraitDefinitions | platform-team | n/a — KubeVela already on radar; no new usage rule required for CRD authoring conventions beyond existing `kubevela-adoption-rationale` spec | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| KubeVela TraitDefinition authoring | platform-architect | — | none | No agent-facing workflow changes; trait YAML authoring follows the same pattern as ComponentDefinitions and does not require a dedicated skill |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Trait definitions are cluster-level CRD manifests, not standalone software components requiring catalog registration |

## TecDocs & ADRs

n/a

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| `kubevela-component-definitions` | Component types must exist before traits can be composed onto them; traits reference component workloads via `scaleTargetRef` and `envFrom` patches | pending |
