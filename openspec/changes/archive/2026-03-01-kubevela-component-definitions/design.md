---
td-board: kubevela-component-definitions
td-issue: td-a8cb01
status: "accepted"
date: 2026-02-27
decision-makers:
  - platform-engineer
  - devops-engineer
consulted:
  - application-team-lead
informed:
  - all-engineers
component: src/ops/kubevela/component-definitions

tech-radar:
  - name: KubeVela ComponentDefinition (CUE)
    quadrant: Patterns/Processes
    ring: Trial
    description: "CUE-based ComponentDefinition as the platform-standard abstraction layer for Kubernetes workload types; promotes intent-driven OAM Applications over raw YAML"
    moved: 1
---

# Design: KubeVela Component Definitions

## Context and problem statement

KubeVela is installed in the local cluster (see `kubevela-local-setup` spec). However, no platform-owned `ComponentDefinition` CRDs are registered, so application teams have no `type:` values to reference in their OAM `Application` manifests. Without standardized definitions, teams either author raw Kubernetes YAML directly (bypassing the abstraction layer) or duplicate ad-hoc CUE templates across services. This change introduces the three foundational workload types — `webservice`, `worker`, and `cron-task` — as platform-managed CRD manifests applied before any application can reference them.

## Decision criteria

This design achieves:

- **Developer ergonomics** (40%): Application teams declare intent (`type: webservice`, `type: worker`, `type: cron-task`) without writing Kubernetes YAML
- **Platform ownership** (30%): Workload abstractions are versioned and maintained by the platform team; changes are reviewed before affecting application deployments
- **Kustomize consistency** (20%): Definition manifests follow the same Kustomize-managed path used by all other platform ops resources (`kustomize-usage-rules` Layer 0)
- **Minimal footprint** (10%): Only the three most common workload patterns are introduced; exotic types remain out of scope

Explicitly excludes:

- Trait definitions (addressed by `kubevela-trait-definitions`)
- Application-team-authored ComponentDefinitions (platform-team-owned only)
- Production cluster rollout automation (local dev cluster scope only)
- CUE schema validation tooling / linting (tracked separately)

## Considered options

### Option 1: Use KubeVela built-in component types

KubeVela ships with built-in types (`webservice`, `worker`) that can be used without authoring CRD manifests. No YAML to maintain.

**Rejected because**: Built-in types cannot be customised per platform (e.g., injecting platform-standard labels, resource defaults, or sidecars). They also vary between KubeVela versions and are not visible in the repository, making the "contract" invisible to application teams. Platform ownership requires the definitions to live in source control.

### Option 2: Helm chart per definition

Package each ComponentDefinition as a standalone Helm chart to allow chart versioning and values overrides.

**Rejected because**: Helm charts introduce unnecessary templating complexity for resources that are themselves template engines (CUE). A plain YAML manifest applied via Kustomize is simpler to audit, review, and apply. Kustomize is already the Layer 0 standard per `kustomize-usage-rules`.

### Option 3: Platform-owned CUE ComponentDefinition manifests via Kustomize (selected)

Store each definition as a `core.oam.dev/v1beta1 ComponentDefinition` YAML in `src/ops/kubevela/component-definitions/`, managed by a `kustomization.yaml` in the same directory. Apply via `kubectl apply -k src/ops/kubevela/component-definitions/` during cluster setup.

**Selected because**: Keeps definitions in source control, follows existing Kustomize conventions, allows platform team to evolve CUE templates without breaking application teams (versioned by the definition spec), and is discoverable and auditable.

## Decision outcome

Three platform-owned `ComponentDefinition` manifests are stored at `src/ops/kubevela/component-definitions/`:

| File | Type | Kubernetes Workload | Notes |
|------|------|---------------------|-------|
| `webservice.yaml` | `webservice` | `Deployment` + `Service` | Configurable `port` (default 8080) |
| `worker.yaml` | `worker` | `Deployment` only | Explicitly no `Service` or `Ingress` |
| `cron-task.yaml` | `cron-task` | `CronJob` | Mandatory `schedule` parameter, no default |

A `kustomization.yaml` lists all three as resources and is applied to the cluster during local setup. Definitions are created in the `vela-system` namespace (KubeVela's default for global definitions).

### CUE Template structure

Each definition embeds a `schematic.cue.template` block. The template follows a minimal structure:

```
output: {
  apiVersion: string
  kind: string
  metadata: { name: context.name, namespace: context.namespace }
  spec: { ... parameter-driven fields ... }
}
```

- `webservice`: two outputs — `Deployment` (with `containers[0].ports[0].containerPort: parameter.port`) and `Service` (with `port: parameter.port`, `targetPort: parameter.port`, `selector: app: context.name`)
- `worker`: one output — `Deployment` (no Service resource emitted)
- `cron-task`: one output — `CronJob` with `spec.schedule: parameter.schedule` (no default; omitting schedule fails CUE validation)

### Parameter schemas

| Definition | Parameter | Type | Default | Required |
|------------|-----------|------|---------|----------|
| `webservice` | `image` | string | — | yes |
| `webservice` | `port` | int | 8080 | no |
| `worker` | `image` | string | — | yes |
| `cron-task` | `image` | string | — | yes |
| `cron-task` | `schedule` | string | — | yes |

## Risks / trade-offs

- **Risk: CUE template bugs are invisible until apply time** → Mitigation: manual `vela dry-run` as part of the cluster setup smoke test; add a bats integration test scenario for each definition
- **Risk: KubeVela version upgrades may deprecate CUE template syntax** → Mitigation: definitions are pinned to the installed KubeVela version; version bumps go through the platform change workflow
- **Trade-off: No default schedule for `cron-task`** — deliberately requires an explicit value to prevent accidental high-frequency jobs from misconfigured defaults
- **Trade-off: Port parameter default for `webservice`** — `8080` is a reasonable web-server default; teams that use non-standard ports must specify explicitly, which is acceptable friction

## Migration plan

1. Add `src/ops/kubevela/component-definitions/` directory with three YAML manifests and a `kustomization.yaml`
2. Update cluster setup documentation (or Makefile target) to include `kubectl apply -k src/ops/kubevela/component-definitions/`
3. Verify each definition with `kubectl get componentdefinition <name> -n vela-system`
4. Run a smoke-test OAM `Application` for each type (bats scenario)

**Rollback**: `kubectl delete -k src/ops/kubevela/component-definitions/` removes all three definitions; existing Application objects that reference them will fail to reconcile but no data is lost.

## Confirmation

- `kubectl get componentdefinition webservice worker cron-task -n vela-system` returns all three without error
- `vela status <app-name>` shows `running` for a test Application using each type
- Worker-type component has no `Service` after deployment (`kubectl get svc` shows no service for the component)
- CronJob for `cron-task` has the supplied schedule in `spec.schedule`
- Omitting `schedule` in a `cron-task` component causes KubeVela render to error

## Open questions

- Should `webservice` also generate a `ServiceMonitor` by default (for Prometheus scraping), or defer that to a trait?
  → Lean toward deferring to a trait (matches `kubevela-trait-definitions` scope); revisit after trait definitions are authored.
- What resource `requests`/`limits` defaults, if any, should be baked into the CUE templates?
  → Omit defaults for now; let application teams specify via OAM properties. Platform-wide defaults can be enforced via OPA/Gatekeeper separately.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| KubeVela ComponentDefinition (CUE templates) | platform-engineer | `.opencode/rules/patterns/kubernetes/kubevela-component-definitions.md` | pending |
| Kustomize overlay structure | platform-engineer | `.opencode/rules/patterns/delivery/iac.md` (kustomize section) | reviewed |
| Open Application Model (OAM) | platform-engineer | n/a — no new technology, OAM already in Adopt ring | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| KubeVela ComponentDefinition authoring | platform-engineer, devops-automation | — | none | No new agent skill needed; authoring follows existing YAML/CUE patterns, not a distinct agent workflow |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated catalog entities introduced; definitions are platform configuration, not a standalone service or tool |

## TecDocs & ADRs

n/a

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| `kustomize-usage-rules` | Definitions are applied via Kustomize; usage rules must be in place before authors reference the pattern | complete |
| `kubevela-local-setup` | KubeVela controller must be running in the cluster before ComponentDefinitions can be registered | complete |
