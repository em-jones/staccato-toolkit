---
created-by-change: gitops-provider-component
last-validated: 2026-03-01
---

# Flux Operator Usage Rules

The ControlPlane Flux Operator manages the Flux controller lifecycle via the `FluxInstance` CRD.
It is deployed as a component of the **st-environment** KubeVela addon, which depends on the
Harbor addon being enabled first.

## Core Principle

Flux Operator is managed inside the **`st-environment` addon** (`vela addon enable ./addons/st-environment`).
The standalone `flux-operator` addon is superseded — do not enable it directly for new environments.

The `st-environment` addon installs flux-operator, creates the `FluxInstance`, registers capability
`GitRepository` sources, and wires per-system `ResourceSet` objects in a single operation.

## Addon Location

```
src/staccato-toolkit/core/assets/addons/st-environment/
├── metadata.yaml       # name, version, dependencies: [{name: harbor}]
├── README.md
├── template.yaml       # KubeVela Application: flux-operator + FluxInstance + ResourceSets
├── parameter.cue       # name, capabilities, gitopsConfig, target, systems
└── resources/
    └── namespace.yaml  # flux-system namespace
```

## Install

```bash
# Harbor must be enabled first (enforced by metadata.yaml dependencies)
vela addon enable ./src/staccato-toolkit/core/assets/addons/harbor

# Then enable st-environment (installs flux-operator, FluxInstance, ResourceSets)
vela addon enable ./src/staccato-toolkit/core/assets/addons/st-environment \
  --set name=local \
  --set target=local \
  --set gitopsConfig.url=oci://harbor-core.harbor.svc.cluster.local/staccato/manifests \
  --set gitopsConfig.configRepoURL=https://github.com/my-org/staccato-config
```

## Verification

```bash
# flux-operator CRD should be registered
kubectl get crd fluxinstances.fluxcd.controlplane.io

# flux-operator controller pod should be Running
kubectl get pods -n flux-system -l app.kubernetes.io/name=flux-operator

# After FluxInstance is applied, all Flux controllers should be Running
kubectl get pods -n flux-system
```

## FluxInstance Configuration

The `FluxInstance` CRD is applied via `gitops-provider-app.yaml` (after addon enable):

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: "ghcr.io/fluxcd"
    artifact: "oci://ghcr.io/controlplaneio-fluxcd/flux-operator-manifests"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  sync:
    kind: OCIRepository
    url: "oci://harbor-core.harbor.svc.cluster.local/staccato/manifests"
    ref: "latest"
    pullSecret: "harbor-oci-credentials"
```

## Rules

- **DO** use `st-environment` addon to install flux-operator — not the standalone `flux-operator` addon
- **DO** declare `dependencies: [{name: harbor}]` in `st-environment/metadata.yaml` — never assume ordering
- **DO** pin the flux-operator Helm chart version explicitly (currently `0.10.0` in `st-environment/template.yaml`)
- **DO** use the OCI Helm chart (`oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator`)
- **DO** install into the `flux-system` namespace
- **DO NOT** enable the standalone `flux-operator` addon for new environments — it is superseded by `st-environment`
- **DO NOT** use the KubeVela community FluxCD addon (`vela addon enable fluxcd`) — it installs vanilla Flux controllers, not the Flux Operator
- **DO NOT** install Flux controllers manually with `flux bootstrap` or `helm install flux`
- **DO NOT** include `source-watcher` in the FluxInstance components list — it is not a Flux controller component
- **DO NOT** enable `image-automation-controller` or `image-reflector-controller` unless image automation is explicitly required
