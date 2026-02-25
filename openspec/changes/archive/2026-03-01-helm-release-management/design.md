---
td-board: helm-release-management
td-issue: td-602675
status: "proposed"
date: 2026-02-27
decision-makers: [platform-architect]
consulted: []
informed: [engineering-team]
component:
  - src/ops/observability
  - src/ops/dev

tech-radar:
  - name: Flux HelmRelease
    quadrant: Infrastructure
    ring: Adopt
    description: Flux v2 HelmRelease CRD used to manage third-party Helm chart installations declaratively via GitOps. Replaces ad-hoc helm install scripts for the observability stack and Gitea.
    moved: 1
---

# Design: Helm Release Management via Flux HelmRelease CRDs

## Context and problem statement

The observability stack (kube-prometheus-stack, Loki, Tempo, Grafana Alloy) and Gitea are currently deployed by shell scripts that call `helm install`/`helm upgrade` directly. These scripts must be re-run manually after cluster recreations, are not reconciled by Flux, and produce cluster state that is not reflected in version control. With Flux v2 bootstrapped (Layer 1) and `staccato-manifests` established as the cluster state source of truth, the correct approach is to declare all chart installations as `HelmRelease` CRDs committed to `staccato-manifests` — letting Flux own chart lifecycle without manual operator intervention.

## Decision criteria

This design achieves:

- **GitOps parity** [40%]: All chart installations are cluster state in `staccato-manifests`, reconciled by Flux
- **Operational safety** [30%]: Auto-remediation on failed upgrades; version-pinned charts prevent silent drift
- **Developer experience** [20%]: `task dev-up` is self-contained; no manual `helm install` required after first bootstrap
- **Compliance with flux-usage-rules** [10%]: All HelmRelease and HelmRepository CRDs follow established conventions

Explicitly excludes:

- Production cluster HelmRelease authoring (local environment only for this change)
- Migration of application manifests (only third-party charts)
- OCI-based HelmRepository sources (HTTP chart registries only)

## Considered options

### Option 1: Keep helm install scripts, add Flux health checks

Retain existing `helm install` scripts but add a Flux `HelmRepository` + `HelmRelease` overlay. Rejected: creates dual sources of truth. Flux reconciliation would conflict with script-installed releases.

### Option 2: HelmRelease CRDs in staccato-manifests (chosen)

Author `HelmRelease` CRDs committed to `staccato-manifests/platform/local/k8s/`. Flux reconciles the full chart lifecycle. Scripts are reduced to bootstrap verification only. This is the correct GitOps pattern per `flux-usage-rules` and `rendered-manifests-layout`.

### Option 3: Flux OCI HelmRepository sources

Use OCI-based chart registries instead of HTTP. Rejected: the current chart registries (grafana.github.io, prometheus-community.github.io, dl.gitea.com) do not expose OCI endpoints. HTTP `HelmRepository` sources are the correct choice for all three registries.

## Decision outcome

**Author HelmRelease CRDs in staccato-manifests.** Three `HelmRepository` sources in `flux-system` (grafana, prometheus-community, gitea-charts) serve as the chart registry references. One `HelmRelease` per chart in the relevant namespace (`monitoring` for observability, `gitea` for Gitea). All releases pin exact chart versions and configure upgrade remediation per `flux-usage-rules`. Values from existing `src/ops/observability/*/values.yaml` files are inlined into `spec.values`. Helm install scripts are removed; `task dev-up` waits for Flux HelmRelease readiness.

## Risks / trade-offs

- Risk: Flux reconciliation loop requires network access to upstream chart registries → Mitigation: `HelmRepository` objects poll infrequently (10m interval); local development only; registry downtime does not prevent cluster operation once charts are installed
- Risk: Inline `spec.values` may diverge from historical values files if not carefully migrated → Mitigation: values are lifted verbatim from existing `src/ops/observability/*/values.yaml` and `src/ops/dev/gitea/values.yaml` during migration
- Trade-off: HelmRelease upgrades are driven by Flux reconciliation; engineers cannot run `helm upgrade` locally to apply ad-hoc changes. This is intentional — all changes must go through `staccato-manifests`

## Migration plan

1. Author `HelmRepository` sources and commit to `staccato-manifests/platform/local/k8s/flux-system/`
2. Author `HelmRelease` CRDs for each chart and commit to `staccato-manifests/platform/local/k8s/{monitoring,gitea}/`
3. Validate Flux reconciles all HelmReleases to `Ready=True` on a fresh cluster
4. Remove `helm install`/`helm upgrade` calls from `src/ops/observability/` and `src/ops/dev/` scripts
5. Update `task dev-up` to remove direct helm calls and add Flux HelmRelease readiness polling
6. Update devbox.json: `helm` may remain for local inspection; `flux` CLI is required for readiness checks

Rollback: If a HelmRelease fails to reconcile, revert the manifests commit in `staccato-manifests`. Flux will revert to the previous chart state via `spec.upgrade.remediation`.

## Confirmation

- `flux get helmreleases -A` reports all releases as `Ready=True` on a fresh `task dev-up`
- `kubectl get pods -n monitoring` shows all observability pods Running
- `kubectl get pods -n gitea` shows Gitea pod Running
- No `helm install` or `helm upgrade` commands appear in `src/ops/observability/` or `src/ops/dev/`
- `task dev-up` completes end-to-end without manual helm invocations

## Open questions

- Should `spec.values` be replaced with `spec.valuesFrom` + ConfigMap for the kube-prometheus-stack (which has a large values file)? Decided: inline for now since values are under the 20-key threshold for most charts; revisit if kube-prometheus-stack values grow beyond 20 customized keys.
- Should the `monitoring` namespace manifest be authored in this change or assumed created by the Flux bootstrap? Decided: author a Namespace manifest in `staccato-manifests/platform/local/k8s/` and reference via Kustomization dependsOn.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Flux HelmRelease / HelmRepository | platform-architect | `.opencode/rules/patterns/delivery/iac.md` | reviewed |
| Kubernetes manifest deployment (GitOps) | platform-architect | `.opencode/rules/patterns/delivery/iac.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Flux HelmRelease authoring | platform-architect, devops workers | `.opencode/skills/devops-automation/SKILL.md` | update | devops-automation skill should include HelmRelease authoring patterns per flux-usage-rules |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | observability-stack | existing | platform-architect | `.entities/component-observability-stack.yaml` | declared | Observability stack managed by HelmReleases; entity already exists |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| observability-stack | `src/ops/observability/mkdocs.yml` | `src/ops/observability/docs/adrs/` | HelmRelease migration guide | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| flux-local-bootstrap | Flux controllers must be running before HelmReleases can be reconciled | spawned |
| flux-usage-rules | HelmRelease and HelmRepository conventions must be established | spawned |
| rendered-manifests-layout | staccato-manifests directory structure must be defined | spawned |
| gitea-local-setup | Gitea is one of the charts being migrated; its deployment must be defined | spawned |
