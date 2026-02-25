---
created-by-change: gitops-provider-component
last-validated: 2026-03-01
---

# Flux v2 Usage Rules

Flux v2 is the platform's GitOps sync engine. It is managed via the ControlPlane Flux Operator
(`flux-operator` addon) and configured via the `FluxInstance` CRD. Flux sources platform
manifests from an OCI artifact in Harbor, NOT from a Git repository.

## Core Principle

Flux in this platform uses **OCIRepository** as its source, NOT `GitRepository`. CI pipelines
render manifests and push them as OCI artifacts to Harbor. Flux pulls and reconciles from Harbor.
This decouples delivery from git history and enables air-gapped deployment.

## Architecture

```
CI pipeline
  └─ flux push artifact → Harbor OCI registry
                              ↓
                    Flux OCIRepository source
                              ↓
                    Flux Kustomization reconciler
                              ↓
                    Kubernetes cluster state
```

## Source Configuration (OCIRepository)

The OCIRepository source is configured via the FluxInstance `sync` spec:

```yaml
sync:
  kind: OCIRepository
  url: "oci://harbor-core.harbor.svc.cluster.local/staccato/manifests"
  ref: "latest"
  path: "./"
  pullSecret: "harbor-oci-credentials"
```

## Pushing Artifacts

```bash
# Push a manifest bundle to Harbor
flux push artifact oci://harbor-core.harbor.svc.cluster.local/staccato/manifests:bootstrap \
  --source=. \
  --path=.

# Tag as latest for Flux to pick up
flux tag artifact oci://harbor-core.harbor.svc.cluster.local/staccato/manifests:bootstrap \
  --tag latest
```

## CLI Operations

```bash
# List all Flux sources
flux get sources oci -n flux-system

# Force reconciliation of OCI source
flux reconcile source oci staccato-manifests -n flux-system

# Check Kustomization status
flux get kustomizations -n flux-system

# Get all Flux resources
flux get all -n flux-system

# Suspend reconciliation (for maintenance)
flux suspend kustomization <name> -n flux-system
flux resume kustomization <name> -n flux-system
```

## Credentials

Flux authenticates to Harbor using a `kubernetes.io/dockerconfigjson` Secret:

```bash
kubectl create secret docker-registry harbor-oci-credentials \
  -n flux-system \
  --docker-server=harbor-core.harbor.svc.cluster.local \
  --docker-username=admin \
  --docker-password=<harbor-admin-password>
```

The Secret name must match the `pullSecret` field in the FluxInstance `sync` spec.

## Rules

- **DO** use `OCIRepository` as the Flux source — NOT `GitRepository` or `HelmRepository`
- **DO** push manifests to Harbor with `flux push artifact` before applying the FluxInstance
- **DO** use the `pullSecret` field in FluxInstance `sync` spec to reference Harbor credentials
- **DO** include `source-controller`, `kustomize-controller`, `helm-controller`, and `notification-controller` in FluxInstance components
- **DO NOT** use `flux bootstrap` — Flux installation is managed by the flux-operator addon
- **DO NOT** use `GitRepository` sources pointing at Gitea — the Gitea/git source approach is superseded
- **DO NOT** commit Flux YAML directly to the cluster — all Flux resources are rendered by CI and pushed as OCI artifacts
- **DO NOT** use `flux` CLI for cluster installation — use `vela addon enable ./addons/flux-operator`

## Flux CLI Installation

The `flux` CLI is provided by the bootstrap devbox:

```json
// src/staccato-toolkit/core/assets/bootstrap/devbox.json
{
  "packages": ["fluxcd-operator"]
}
```

```bash
# Enter bootstrap devbox shell (provides flux, vela, kubectl, k0sctl)
devbox shell
```
