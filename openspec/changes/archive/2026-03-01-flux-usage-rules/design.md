---
td-board: flux-usage-rules
td-issue: td-e0542e
status: "accepted"
date: 2026-02-27
decision-makers: [platform-architect]
consulted: []
informed: [engineering-team]

tech-radar:
  - name: Flux v2
    quadrant: Infrastructure
    ring: Adopt
    description: GitOps sync engine for reconciling Kubernetes cluster state from the staccato-manifests repository. Chosen over Argo CD for lightweight CRD-native design and pull-based GitOps model.
    moved: 1
---

# Design: Flux v2 GitOps Sync Engine Usage Rules

## Context and problem statement

The staccato-toolkit platform uses Flux v2 as its GitOps sync engine. Flux continuously reconciles the cluster state by reading manifests from the `staccato-manifests` repository (hosted on Gitea locally, GitHub in production). Without documented usage rules, engineers make inconsistent decisions about reconcile intervals, pruning, health checks, source authentication, and alert configuration — leading to drift, undetected failures, and operational toil.

This design establishes the architectural conventions and rationale behind the four capability specs: `flux-sources`, `flux-kustomizations`, `flux-helm`, and `flux-alerting`.

## Decision criteria

This design achieves:

- **Consistency** [40%]: All Flux CRDs follow the same naming, interval, and pruning conventions across teams
- **Operational safety** [35%]: Health checks, pruning, and upgrade remediation prevent silent failures and orphaned resources
- **Auditability** [25%]: All GitOps configuration lives in `staccato-manifests`; application repos contain no Flux CRDs

Explicitly excludes:

- Flux controller installation and bootstrapping (covered by `local-cluster-provisioning` spec)
- Image automation (`ImageRepository`, `ImagePolicy`) — not adopted in this phase
- Multi-tenancy RBAC configuration for Flux

## Considered options

### Option 1: Argo CD as GitOps engine

Full-featured GitOps platform with a UI, SSO, and RBAC. Rejected because it requires heavier resource footprint, introduces a web UI dependency, and the Flux CRD-native model aligns better with the platform's infrastructure-as-code philosophy. Flux's pull-based reconciliation model also fits the GitOps security model more cleanly.

### Option 2: Flux v2 (selected)

Lightweight CRD-native GitOps operator with composable source/reconciler separation. Supports both Kustomize and Helm natively. Alerting via notification controller. Well-suited for the staccato-toolkit's scale and GitOps-first approach.

### Option 3: No GitOps engine (manual kubectl apply)

Eliminated early — manual apply in CI/CD is error-prone, requires credentials in the pipeline, and does not support drift detection or automatic reconciliation.

## Decision outcome

**Flux v2** is adopted as the sole GitOps sync engine. All cluster state SHALL flow through Flux Kustomizations or HelmReleases originating from sources declared in `flux-system`. The architectural constraint that no Flux CRDs live in application repos is enforced by these usage rules.

Key design decisions:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Source namespace | `flux-system` | Single source of truth; cross-namespace refs for consumers |
| Prune default | `prune: true` | Prevents orphaned resources on manifest deletion |
| Health checks | Required for all Deployments/StatefulSets/DaemonSets | Enables safe dependency ordering |
| Reconcile intervals | 1m (apps), 2m (infra), 5m (production sources) | Balance between freshness and API server load |
| Auth for Gitea | `basic-auth` Secret | Gitea supports username/password; simpler than SSH for internal use |
| Auth for GitHub | PAT/deploy key Secret | SSH key or PAT; no hardcoded credentials |
| Alert severity | `error` in production, `info` in dev | Reduce noise in production; full visibility in dev |

## Risks / trade-offs

- Risk: Gitea internal URL changes break local cluster sources → Mitigation: Source URLs parameterized via Kustomize substitution variables per environment
- Risk: Strict health check timeouts block long-running migrations → Mitigation: Set `spec.timeout: 5m` as default; allow override with comment justification
- Risk: Force reconcile overuse masks underlying issues → Mitigation: Usage rules prohibit using force reconcile as a workaround; document root-cause investigation steps
- Trade-off: `prune: true` by default risks data loss for stateful sets → Mitigation: Explicit opt-out with mandatory comment justification

## Migration plan

1. Existing Flux CRDs in `staccato-manifests` are audited against these rules at change archive time
2. Non-conforming CRDs (missing health checks, wrong intervals, no prune) are flagged as implementation tasks
3. No cluster downtime required — rule application is incremental
4. Rollback: Rules are documentation-only; no cluster changes occur at archive time

## Confirmation

- All new Kustomizations reviewed against this spec pass the scenario checklist in `flux-kustomizations/spec.md`
- Flux alert notifications fire correctly for test-induced failures in the local cluster
- `flux reconcile` procedure documented and tested in the local kind cluster
- No Flux CRDs found in any application repository (verified by code review policy)

## Open questions

- Should `ImageRepository` / `ImagePolicy` (Flux image automation) be adopted in a future change for automated image tag updates?
- Should a dedicated Flux Dashboard (Weave GitOps OSS) be added to the observability stack for GitOps visibility?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Infrastructure / GitOps | platform-architect | `openspec/changes/flux-usage-rules/specs/flux-sources/spec.md` | created |
| Infrastructure / GitOps | platform-architect | `openspec/changes/flux-usage-rules/specs/flux-kustomizations/spec.md` | created |
| Infrastructure / GitOps | platform-architect | `openspec/changes/flux-usage-rules/specs/flux-helm/spec.md` | created |
| Infrastructure / GitOps | platform-architect | `openspec/changes/flux-usage-rules/specs/flux-alerting/spec.md` | created |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Flux v2 GitOps workflow | devops-automation, development-orchestrator | `.opencode/skills/devops-automation/SKILL.md` | update | The devops-automation skill should reference Flux CRD authoring rules and the force-reconcile procedure so agents generating GitOps manifests follow these conventions |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Flux usage rules do not introduce new catalog entities; Flux controllers are infrastructure components already represented in the cluster |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
