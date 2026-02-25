---
td-board: gitops-tool-selection
td-issue: td-2adaad
status: "accepted"
date: 2026-02-27
decision-makers:
  - platform-architect
consulted:
  - infra-engineer
  - devops-engineer
informed:
  - all-platform-engineers
component: docs

tech-radar:
  - name: Flux v2
    quadrant: Infrastructure
    ring: Adopt
    description: "Pull-based GitOps sync engine — lightweight, CRD-native, strong Kustomize and Helm integration; selected over ArgoCD for CLI/platform workloads"
    moved: 1
  - name: ArgoCD
    quadrant: Infrastructure
    ring: Hold
    description: "Rejected as primary GitOps engine: UI-heavy, higher operator overhead, not aligned to CLI/platform use case; may be revisited for UI-centric workloads"
    moved: 0
---

# Design: GitOps Tool Selection — Flux v2 as Sync Engine

## Context and problem statement

The `staccato-toolkit` platform deploys Kubernetes workloads across multiple environments but has no formal GitOps sync engine. Without one, reconciliation is ad hoc, drift goes undetected, and delivery is inconsistent. We evaluated Flux v2 and ArgoCD as the two dominant OSS GitOps engines to select a standard pull-based continuous delivery path for all platform workloads.

## Decision criteria

This design achieves:

- **Pull-based reconciliation** (40%): Controllers run in-cluster and pull desired state from Git — no push-based pipelines writing to clusters.
- **Lightweight operational footprint** (25%): Minimal controller resource usage; no mandatory UI or additional database.
- **Native Kubernetes CRD API** (20%): All configuration expressed as first-class Kubernetes objects with `kubectl`-compatible tooling.
- **Strong Kustomize and Helm integration** (15%): Both delivery paths supported natively; no custom templating layer required.

Explicitly excludes:

- UI-based workflow tooling (Flux has an optional UI; this change does not adopt it)
- Multi-tenant SaaS GitOps hosting (out of scope for a platform toolkit)
- Progressive delivery / canary routing (addressed separately via Flagger if needed)

## Considered options

### Option 1: ArgoCD

ArgoCD is a mature GitOps platform with a rich web UI, RBAC, SSO integration, and an application-centric model. It is widely adopted and has a large ecosystem.

**Rejected because**:
- UI-centric design adds mandatory operator overhead (Redis, Dex, ArgoCD Server, Repo Server) not needed for a CLI/platform use case.
- The `Application` CRD is ArgoCD-proprietary; lock-in is higher than Flux's CNCF-standard CRDs.
- Heavier resource footprint for a toolkit where simplicity and composability are primary values.
- No advantage over Flux for our headless, CLI-driven delivery model.

### Option 2: Flux v2 (selected)

Flux v2 is a set of composable controllers (`source-controller`, `kustomize-controller`, `helm-controller`) that implement GitOps via standard Kubernetes CRDs. It is CNCF Graduated, pull-based by design, and has no mandatory UI.

**Selected because**:
- Pull-based model aligns with GitOps principles and eliminates push-pipeline cluster access.
- Minimal footprint: three focused controllers vs. ArgoCD's five+ components.
- `GitRepository`, `Kustomization`, `HelmRelease` CRDs are `kubectl`-native and easy to version, audit, and test.
- First-class Kustomize and Helm support — both delivery paths used in staccato-toolkit.
- OSS-first: CNCF Graduated, no enterprise feature gates for core functionality.
- No UI dependency; integrates cleanly with existing CLI and CI tooling.

## Decision outcome

**Flux v2 is adopted** as the sole supported GitOps sync engine for `staccato-toolkit` platform workloads. ArgoCD is explicitly **not adopted** and must not be introduced without a new ADR superseding this one. The decision is recorded in ADR-0025 (`docs/adr/0025-adopt-flux-v2-gitops.md`).

## Risks / trade-offs

- **Risk**: Flux's decentralized controller model makes end-to-end sync observability harder to surface than ArgoCD's dashboard → Mitigation: wire Flux controller metrics to the existing Prometheus/Grafana stack per `delivery/observability.md`.
- **Risk**: GitRepository polling interval introduces eventual consistency lag (not real-time push) → Mitigation: document maximum reconciliation interval in usage rules; use Flux webhook receiver for latency-sensitive environments.
- **Trade-off**: No built-in UI for non-CLI users → accepted for the platform toolkit use case; UI tooling is addressed separately.
- **Trade-off**: Flux bootstrap is cluster-side (not Helm-installable in one step); requires initial `flux install` or Terraform-based bootstrapping → document in the repository layout usage rules.

## Migration plan

1. Install Flux v2 controllers via `flux install` (or Terraform provider) into each target cluster.
2. Create a GitOps repository following the canonical `clusters/`, `infrastructure/`, `apps/` layout.
3. Apply `GitRepository` pointing to the platform GitOps repo (SSH deploy key in cluster Secret).
4. Apply initial `Kustomization` for `infrastructure/` workloads.
5. Progressively migrate workloads from ad hoc `kubectl apply` to `Kustomization` or `HelmRelease` objects.
6. Rollback: Flux controllers are stateless; remove Flux CRs and controllers without data loss. Re-apply manifests directly via `kubectl` if needed.

## Confirmation

How to verify this design is met:

- **Test cases**: `flux check` passes on all target clusters; `flux get kustomizations` shows `Ready=True` for all managed workloads.
- **Metrics**: Flux controller metrics (`gotk_reconcile_duration_seconds`, `gotk_reconcile_condition`) are visible in Prometheus and have alerts for `NotReady` conditions exceeding 5 minutes.
- **Acceptance criteria**: At least one production workload is successfully reconciled end-to-end by Flux v2 via a `Kustomization` or `HelmRelease` object; ADR-0025 is merged.

## Open questions

- Should we adopt the Flux GitHub App for webhook-based push notifications to minimize polling lag? (Assess in Trial period)
- Should `HelmRepository` sources be co-located in the GitOps repo or managed separately? (Decide at first HelmRelease onboarding)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Flux v2 (`source-controller`, `kustomize-controller`, `helm-controller`) | platform-architect | `openspec/specs/gitops-sync-engine/spec.md` (usage rules TBD post-archive) | pending |
| Kubernetes manifest linting (kube-linter) | devops-engineer | `openspec/specs/kubernetes-manifest-linting/spec.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Flux v2 GitOps workflow | devops-automation agent | `.opencode/skills/devops-automation/SKILL.md` | update | devops-automation skill should document how to author Flux CRDs and validate GitOps repository layout |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | staccato-toolkit | existing | platform-architect | `.entities/component-staccato-toolkit.yaml` | declared | ADR added to existing toolkit component; no new entity needed |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| staccato-toolkit | `mkdocs.yml` | `docs/adr/` | `docs/adr/0025-adopt-flux-v2-gitops.md` | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
