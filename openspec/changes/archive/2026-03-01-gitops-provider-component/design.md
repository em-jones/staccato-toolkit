---
status: "proposed"
date: 2026-03-01
decision-makers: [platform-architect]
consulted: []
informed: [engineering-team]
component:
  - src/staccato-toolkit/core

tech-radar:
  - name: Harbor
    quadrant: Infrastructure
    ring: Adopt
    description: >
      Cloud-native OCI registry by CNCF. Provides the artifact store for Flux OCI source
      reconciliation. Deployed as a custom KubeVela addon. Selected over Gitea (git source)
      to decouple manifest delivery from git history and enable OCI-native artifact promotion.
    moved: 1
  - name: Flux Operator
    quadrant: Infrastructure
    ring: Adopt
    description: >
      ControlPlane's Flux Operator manages Flux controller lifecycle via the FluxInstance CRD.
      Deployed as a custom KubeVela addon wrapping the OCI Helm chart. Provides a declarative
      interface for Flux configuration via the FluxInstance CRD.
    moved: 1
  - name: Flux v2
    quadrant: Infrastructure
    ring: Adopt
    description: >
      GitOps sync engine. Pull-based, CNCF Graduated. OCIRepository source replaces
      GitRepository/Gitea source from prior flux-local-bootstrap design.
    moved: 1
  - name: OAM / KubeVela
    quadrant: Patterns/Processes
    ring: Trial
    description: >
      Open Application Model. KubeVela addons used to manage platform infrastructure
      (Harbor, Flux Operator) alongside OAM Applications for workloads. Remains Trial —
      expanding usage to include the addon mechanism for platform component lifecycle.
    moved: 0
td-board: gitops-provider-component
td-issue: td-9f49f8
---

# Design: GitOps Provider Component

## Context and problem statement

After a k0s cluster is provisioned and KubeVela is installed (`k0s-cluster-bootstrap`), the
platform needs a GitOps sync engine. The prior `flux-local-bootstrap` design installed Flux
imperatively via Helm with a Gitea `GitRepository` source — this creates two problems: (1) the
GitOps provider is itself not managed declaratively, and (2) Gitea as a git source couples
manifest delivery to a running git server that must be bootstrapped before Flux. This change
replaces that approach by using the **KubeVela addon mechanism** to manage Harbor and
flux-operator as platform infrastructure, and a KubeVela OAM `Application` to declare the
FluxInstance. Flux then sources rendered manifests from Harbor OCI artifacts, decoupling delivery
from git history entirely.

## Decision criteria

This design achieves:

- **Declarative GitOps provider** [35%]: Harbor and flux-operator are managed as KubeVela addons;
  FluxInstance declared as an OAM Application component — fully declarative lifecycle
- **OCI-native artifact delivery** [30%]: Flux pulls from Harbor OCI artifacts; CI pushes
  rendered manifests as OCI; no git server dependency in the sync path
- **Supersedes flux-local-bootstrap** [20%]: Gitea/GitRepository source replaced; one fewer
  in-cluster service to manage for the bootstrap path
- **Self-contained bootstrap** [15%]: All addon assets embedded in `staccato-toolkit/core`;
  no external registry or git host required at bootstrap time

Explicitly excludes:

- Gitea deployment (no longer needed for the GitOps sync path; Gitea may be reintroduced for
  developer git workflows separately)
- Flux image automation (`ImageRepository`, `ImagePolicy`)
- Multi-tenancy RBAC for Flux
- Harbor replication to external registries
- Harbor vulnerability scanning (Trivy component) in local dev
- Publishing addons to the KubeVela community registry (addons are local-path only)

## Considered options

### Option 1: Keep Gitea + GitRepository source (flux-local-bootstrap)

Retain the existing design: Flux watches a Gitea-hosted git repo. Harbor not required.

**Rejected**: Gitea must be bootstrapped before Flux — another sequencing dependency. Gitea
git history is not the right audit trail for rendered manifests (that's what the OCI artifact
digest provides). OCI source is architecturally cleaner for CI-rendered artifacts.

### Option 2: GitHub/GitLab as Flux source (external git)

Skip in-cluster git entirely; Flux sources from a public GitHub repo.

**Rejected**: Requires network access from the cluster to GitHub. Breaks the self-contained
offline-capable local bootstrap requirement. Production may be air-gapped.

### Option 3: Inline OAM `helm` components in gitops-provider Application

Harbor and flux-operator declared as `helm`-typed components directly inside a single OAM
`Application` manifest with KubeVela Workflow ordering.

**Rejected in favour of Option 4**: Inline helm components work but do not leverage KubeVela's
addon mechanism. Addons provide versioned lifecycle management (`vela addon enable/disable/upgrade`),
a structured directory format with `metadata.yaml`, and reusability across clusters. The addon
model is the right abstraction for platform infrastructure that must be managed independently of
workload applications.

### Option 4: Custom KubeVela addons + OAM Application (selected)

Harbor and flux-operator each become a custom KubeVela addon under
`src/staccato-toolkit/core/assets/addons/`. The bootstrap CLI enables them via
`vela addon enable <path>`. The FluxInstance is then declared as a component in a thin
`gitops-provider-app.yaml` OAM Application.

**Selected**: Addon mechanism provides clean lifecycle separation between platform infrastructure
(addons) and workload orchestration (Applications). Addons are versioned, can declare
dependencies on each other via `metadata.yaml`, and are enabled/disabled atomically. Consistent
with how KubeVela itself recommends managing platform-level operators.

## Decision outcome

Harbor and flux-operator SHALL each be implemented as a **custom KubeVela addon** stored under
`src/staccato-toolkit/core/assets/addons/<addon-name>/`. The bootstrap CLI enables them in order
via `vela addon enable` before applying the `gitops-provider-app.yaml` OAM Application.
The OAM Application is reduced to declaring only the `flux-instance` component (a `k8s-objects`
component applying the FluxInstance CRD), since Harbor and flux-operator lifecycle are now owned
by the addon mechanism.

### Addon directory layout

Each addon follows the standard KubeVela addon structure:

```
assets/addons/
├── harbor/
│   ├── metadata.yaml       # name, version, description, system requirements
│   ├── README.md           # what Harbor is, why it's included, how to use it
│   ├── template.yaml       # KubeVela Application: helm component for harbor/harbor chart
│   └── resources/          # supplementary k8s-objects (namespace, credentials Secret template)
└── flux-operator/
    ├── metadata.yaml       # name, version, description, depends-on: harbor (for ordering)
    ├── README.md           # what flux-operator is, why it's included, how to use it
    ├── template.yaml       # KubeVela Application: helm component for flux-operator OCI chart
    └── resources/          # FluxInstance CRD manifest applied after operator is ready
```

### Bootstrap sequence

```
Phase 1  k0sctl apply                    (k0s-cluster-bootstrap)
Phase 2  kustomize build | kubectl apply  (KubeVela core — k0s-cluster-bootstrap)
Phase 3a vela addon enable ./addons/harbor
Phase 3b vela addon enable ./addons/flux-operator   # depends-on: harbor in metadata.yaml
Phase 3c CLI pushes initial OCI artifact to Harbor  (staccato bootstrap oci-seed)
Phase 3d kubectl apply -f gitops-provider-app.yaml  (FluxInstance component only)
Phase 4  Flux OCIRepository reconciles from Harbor  (GitOps loop active)
```

### Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Harbor install method | Custom KubeVela addon | Versioned lifecycle; `vela addon enable/disable/upgrade`; structured format |
| flux-operator install | Custom KubeVela addon | Same rationale as Harbor; `metadata.yaml` dependency on harbor enforces ordering |
| flux-instance | OAM `k8s-objects` component in thin Application | Thin wrapper around existing FluxInstance CRD asset; separate from addon lifecycle |
| Addon ordering | `dependencies` in flux-operator `metadata.yaml` | KubeVela addon mechanism waits for listed dependencies before enabling |
| Flux source type | OCIRepository → Harbor | Decouples sync from git; OCI digest = immutable artifact reference |
| Cold-start solution | `staccato bootstrap oci-seed` CLI step | Pushes initial artifact to Harbor before FluxInstance is applied |
| Credential injection | CLI creates Secrets before `vela addon enable` | Secrets never in addon YAML; injected at bootstrap time |
| Addon storage | `staccato-toolkit/core` embed.FS | Co-located with k0s config and KubeVela kustomize assets |

## Risks / trade-offs

- **Risk**: `vela` CLI must be available at bootstrap time to enable addons →
  **Mitigation**: `kubevela` CLI is already in `core/assets/bootstrap/devbox.json`; pinned to
  v1.10.7 matching the vela-core chart version.
- **Risk**: KubeVela addon mechanism requires vela-core to be running before `vela addon enable`
  is called → **Mitigation**: Phase 3 runs after Phase 2 confirms vela-core Deployment is Ready.
- **Risk**: Harbor is heavy (7 pods) for a bootstrap component →
  **Mitigation**: Harbor resource limits set low in the addon `template.yaml` values for local
  dev. Harbor PVCs use the default StorageClass (ephemeral on cluster delete is acceptable).
- **Risk**: OCI artifact push requires the Flux CLI inside a container at bootstrap time →
  **Mitigation**: `staccato bootstrap oci-seed` runs `flux push artifact` locally via the
  `fluxcd-operator` CLI already present in the bootstrap devbox; no in-cluster Job needed.
- **Risk**: flux-local-bootstrap design is superseded; work done on it may need to be discarded →
  **Mitigation**: flux-local-bootstrap is marked superseded in its design.md; no implementation
  work was completed on it.
- **Trade-off**: Two separate `vela addon enable` calls instead of a single `kubectl apply` →
  Acceptable; addon enables are fast and the separation gives cleaner lifecycle boundaries.

## Migration plan

1. Create `src/staccato-toolkit/core/assets/addons/harbor/` with `metadata.yaml`, `README.md`,
   `template.yaml` (helm component: `harbor/harbor` chart, pinned version, low resource values)
2. Create `src/staccato-toolkit/core/assets/addons/flux-operator/` with `metadata.yaml`
   (declares `depends-on: harbor`), `README.md`, `template.yaml` (helm component:
   `oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator`, pinned version),
   `resources/` (flux-system Namespace)
3. Update `flux-instance.yaml` asset: change source from `GitRepository` to `OCIRepository`;
   add `sync.url` pointing at Harbor internal service URL; add `sync.secretRef`
4. Write `gitops-provider-app.yaml`: thin OAM Application with single `flux-instance`
   component (`k8s-objects` type applying the FluxInstance manifest)
5. Update `staccato bootstrap init` to run Phase 3:
   a. `vela addon enable ./addons/harbor`
   b. `vela addon enable ./addons/flux-operator`
   c. CLI creates Harbor dockerconfigjson Secret in `flux-system`
   d. `staccato bootstrap oci-seed` — pushes bootstrap OCI artifact to Harbor
   e. `kubectl apply -f gitops-provider-app.yaml`
6. Mark `flux-local-bootstrap` design as superseded
7. Update `src/ops/dev/README.md` to reflect addon-based Harbor + Flux OCI setup
8. Rollback: `vela addon disable flux-operator && vela addon disable harbor`

## Confirmation

- `vela addon list` shows `harbor` and `flux-operator` both `enabled`
- `kubectl get pods -n harbor` shows all Harbor pods `Running`
- `kubectl get pods -n flux-system` shows source-controller, kustomize-controller,
  helm-controller, notification-controller all `Running`
- `kubectl get application gitops-provider -n vela-system` shows `phase: running`
- `flux get sources oci -n flux-system` shows source `Ready=True`
- `flux reconcile source oci staccato-manifests -n flux-system` completes without error
- Running `staccato bootstrap init` twice does not produce errors on the second run

## Open questions

- Should `staccato bootstrap oci-seed` use a locally-run `flux push artifact` (requires Flux
  CLI on host) or a one-shot in-cluster Job? (Preference: local CLI — simpler, no image pull
  needed; Flux CLI is already in bootstrap devbox)
- Should the Harbor addon expose parameters (admin password, storage size) via `parameter.cue`
  or rely solely on CLI-injected Secrets? (Preference: CLI-injected Secrets for credentials;
  `parameter.cue` for resource sizing overrides)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Harbor (OCI registry) | platform-architect | `.opencode/rules/technologies/harbor.md` | pending |
| Flux Operator | platform-architect | `.opencode/rules/technologies/flux-operator.md` | pending |
| Flux v2 (OCIRepository source) | platform-architect | `.opencode/rules/technologies/flux.md` | pending |
| KubeVela addon authoring | platform-architect | `.opencode/rules/technologies/kubevela.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| GitOps bootstrap workflow (OCI path) | devops-automation | `.opencode/skills/devops-automation/SKILL.md` | update | Update to document addon-based Harbor + Flux bootstrap; replace Gitea/GitRepository procedure |
| KubeVela addon authoring | worker | `.opencode/skills/go-developer/SKILL.md` | none | Addon YAML authoring covered by kubevela usage rules; no skill change needed |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new catalog entities; Harbor and Flux are infrastructure, not catalogued platform components |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| k0s-cluster-bootstrap | k0s cluster with KubeVela must exist before addons can be enabled | spawned |
