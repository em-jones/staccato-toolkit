---
td-board: ops-environment-render-workflow
td-issue: td-6d5c9d
status: accepted
date: 2026-03-03
decision-makers: [platform-architect]
component:
  - src/ops/workloads
  - src/staccato-toolkit/core/assets/addons/st-workloads

tech-radar:
  - name: Dagger Cloud
    quadrant: Infrastructure
    ring: Adopt
    description: Used as the remote Dagger engine for in-cluster manifest rendering Jobs. Eliminates the need for a privileged in-cluster Dagger engine deployment.
    moved: 1
---

# Design: ops-environment-render-workflow

## Context and problem statement

The `ops-environment` KubeVela component renders a child OAM Application that applies
an `staccato-environment` component (emitting a ConfigMap with `kustomization.yaml`). Rendering
Helm charts from that ConfigMap to OCI artifacts in Harbor was an external CI step with no
guaranteed relationship to the OAM reconciliation lifecycle — operators had to coordinate
`kubectl apply` and CI pipeline runs manually. This design makes rendering an automatic
workflow step inside the child Application, triggered by KubeVela reconciliation with no
new user-facing parameters.

## Decision criteria

This design achieves:

- **Declarative render trigger** (50%): applying or updating `ops-environment` automatically
  renders and pushes manifests without manual CI coordination
- **Minimal Job footprint** (30%): the in-cluster Job image contains only the Dagger CLI;
  all tooling (kustomize, helm, flux-cli) runs in Dagger-managed containers
- **Zero new parameters** (20%): all workflow step inputs are derived from existing
  `gitopsConfig` fields (`url`, `ref`, `pullSecret`) and `name`

Explicitly excludes:

- In-cluster Dagger engine deployment (uses Dagger Cloud instead)
- `runtime-environment` wiring (deferred to a follow-on change)
- Trigger mechanisms other than KubeVela Application reconciliation (e.g. scheduled re-render)

## Considered options

### Option 1: Dagger Cloud as engine (chosen)

The Job Pod runs alpine + Dagger CLI only. The Dagger CLI connects to Dagger Cloud
(`DAGGER_CLOUD_TOKEN`) as the remote engine. Kustomize, helm, and flux-cli run inside
ephemeral containers managed by the Dagger Cloud engine.

Rationale: no privileged containers in the cluster, no DaemonSet overhead, Dagger Cloud
provides caching across invocations.

### Option 2: In-cluster Dagger engine Deployment

Deploy `dagger/engine` as a privileged Deployment with a ClusterIP service. Job Pods set
`DAGGER_RUNNER_HOST=tcp://dagger-engine:1234`.

Rejected: requires privileged pods, adds a persistent workload to maintain, and introduces
a single point of failure for rendering.

### Option 3: Direct container (no Dagger)

Job runs `alpine + kustomize + helm + flux-cli` directly without Dagger.

Rejected: defeats the layered tool isolation model; tool versions and caching become the
cluster operator's responsibility instead of the Dagger module's.

## Decision outcome

**Dagger Cloud as remote engine, invoked from a minimal alpine+Dagger-CLI Job.**

`gitopsConfig.ref` is used as the canonical version identifier — it drives both the Flux
reconciliation tag and the OCI artifact tag suffix (`<chart>:<env>-<ref>`), making the
two tightly coupled by construction. The `Render` Dagger function drops its
`source *Directory` parameter (which required a git checkout) in favour of explicit `sha`
and `sourceURL` string parameters, enabling in-cluster invocation with no git context.

The `moduleRef` and `daggerCloudTokenSecret` are hardcoded constants in the
`render-manifests` WorkflowStepDefinition — they are platform internals, not operator
concerns, and reducing the parameter surface keeps `ops-environment` ergonomic.

## Risks / trade-offs

- **Risk**: Dagger Cloud availability affects rendering → Mitigation: KubeVela will
  retry the workflow step on failure; `backoffLimit: 2` on the Job adds container-level
  retries before the step fails
- **Risk**: `gitopsConfig.ref = "latest"` (the default) produces non-reproducible OCI
  tags → Mitigation: document that `ref` MUST be set to a commit SHA for production use;
  `"latest"` is only appropriate for bootstrapping
- **Trade-off**: Dagger Cloud egress from in-cluster Jobs — tool layer images (kustomize,
  flux-cli) are pulled via Dagger Cloud on each render if not cached

## Migration plan

1. Pre-create `dagger-cloud-token` secret in `vela-system`:
   ```bash
   kubectl create secret generic dagger-cloud-token -n vela-system \
     --from-literal=token=<DAGGER_CLOUD_TOKEN>
   ```
2. Enable the updated `st-workloads` addon (deploys `render-manifests` WorkflowStepDefinition)
3. Re-apply existing `ops-environment` Applications with `gitopsConfig.ref` set to the
   current git SHA (replacing any `"latest"` values)
4. Verify: `kubectl get jobs -n vela-system` shows a `render-<env>-*` Job that completes

**Rollback**: disable the `st-workloads` addon, re-enable previous version.

## Confirmation

- `kubectl get workflowstepdefinitions render-manifests` returns the definition
- Applying an `ops-environment` Application with `gitopsConfig.ref: <sha>` creates a Job
  in `vela-system` that completes successfully
- Harbor contains OCI artifacts tagged `<chart>:<env>-<sha>` after Job completion
- `go test .` passes in `src/ops/workloads/` after `Render` signature update

## Open questions

- **Dagger CLI image**: which image provides alpine + Dagger CLI only?
  `ghcr.io/dagger/dagger:v0.19.11` is the candidate — needs verification that it is a
  thin CLI image (not the full engine). The `WorkflowStepDefinition` should make this
  configurable with a sensible default.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Dagger Cloud | platform-architect | `.opencode/rules/technologies/dagger-cloud.md` | pending |
| KubeVela WorkflowStepDefinition | platform-architect | `.opencode/rules/technologies/kubevela.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| ops-environment in-cluster render workflow | worker, development-orchestrator | `.opencode/skills/devops-automation/SKILL.md` | update | Add render workflow trigger (kubectl apply ops-environment with gitopsConfig.ref) as the canonical render invocation path alongside dagger call render |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| n/a | — | n/a | — | — | n/a | No new catalog entities; existing st-workloads addon components cover this |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| n/a | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| add-cue-quality-tooling | New CUE files (`render-manifests.cue`, updated `ops-environment.cue`) require CUE linting and formatting in CI | spawned |
