---
td-board: gitops-provider-component
td-issue: td-9f49f8
---

# Proposal: GitOps Provider Component

## Why

After a k0s cluster is provisioned and KubeVela is installed (Phase 2), the platform needs a
GitOps sync engine. The current `flux-local-bootstrap` design installs Flux imperatively via Helm
and a direct git-based source. This change supersedes that design by expressing the entire GitOps
provider stack — Harbor (OCI registry) + Flux Operator + FluxInstance — as a single OAM
`Application` managed by KubeVela. This makes the GitOps provider itself GitOps-aware, allows
KubeVela to enforce component ordering, and introduces Harbor as the OCI artifact registry that
Flux pulls from (replacing the Gitea git-source pattern).

## What Changes

- Add `gitops-provider-app.yaml` as an embedded asset in `staccato-toolkit/core` — an OAM
  `Application` with three ordered components: `harbor`, `flux-operator`, `flux-instance`
- Update existing `flux-instance.yaml` asset to use `OCIRepository` source pointing at Harbor
  instead of a `GitRepository` source pointing at Gitea
- Add KubeVela `Workflow` steps to enforce ordering:
  1. Deploy Harbor → wait until ready
  2. Push initial OCI bootstrap artifact to Harbor (via CLI job step)
  3. Deploy flux-operator → wait until CRDs registered
  4. Deploy flux-instance → Flux controllers running
- Supersede `flux-local-bootstrap` design (Helm + GitRepository pattern replaced by this OAM
  composite approach)
- Add `harbor` and `flux-operator` Helm chart references to bootstrap `devbox.json` or Taskfile
  for initial credential/repo seeding

## Capabilities

### New Capabilities

- `gitops-provider-oam-app`: OAM `Application` spec for the composite GitOps provider
  (harbor + flux-operator + flux-instance); asset embedded in `staccato-toolkit/core`
- `harbor-registry-component`: OAM `ComponentDefinition` (or inline helm-release component) for
  Harbor; provides the OCI registry that Flux pulls rendered manifests from
- `flux-operator-component`: OAM component wrapping the flux-operator Helm chart install
- `flux-oci-source`: Updated `FluxInstance` spec using `OCIRepository` source against Harbor;
  replaces the `GitRepository`/Gitea source from `flux-local-bootstrap`

### Modified Capabilities

- `flux-instance-config`: Existing `flux-instance.yaml` asset updated — source type changes from
  `GitRepository` to `OCIRepository`; Harbor endpoint and credentials injected at bootstrap time

## Impact

- Affected services/modules: `src/staccato-toolkit/core/assets/bootstrap/`, `src/ops/dev/`,
  `Taskfile.yaml`, `openspec/changes/flux-local-bootstrap/` (superseded)
- API changes: No
- Data model changes: No
- Dependencies:
  - `harbor/harbor` Helm chart (new)
  - `oci://ghcr.io/controlplaneio-fluxcd/flux-operator` Helm chart (already in bootstrap devbox)
  - `fluxcd-operator` CLI already in `core/assets/bootstrap/devbox.json`
- Prerequisite: `k0s-cluster-bootstrap` (cluster must exist with KubeVela running)
- Supersedes: `flux-local-bootstrap` design (Helm + GitRepository source approach)
