---
created-by-change: gitops-provider-component
last-validated: 2026-03-01
---

# Harbor Usage Rules

Harbor is the platform's OCI registry for Flux GitOps reconciliation. It is deployed as a
custom KubeVela addon and serves as the artifact store for CI-rendered platform manifests.

## Core Principle

Harbor is managed as a **KubeVela addon** (`vela addon enable ./addons/harbor`), NOT as a
standalone Helm release or inline OAM component. This gives versioned lifecycle management
(`vela addon enable/disable/upgrade`) and a clean separation from workload applications.
Harbor admin credentials MUST be injected as Kubernetes Secrets before addon enable — never
stored in addon YAML files.

## Addon Location

```
src/staccato-toolkit/core/assets/addons/harbor/
├── metadata.yaml       # name, version, system requirements
├── README.md           # what Harbor is and how to use it
├── template.yaml       # KubeVela Application with helm component
├── parameter.cue       # storageSize, dbSize overrides
└── resources/
    └── namespace.yaml  # harbor namespace
```

## Install

```bash
# Inject credentials first (REQUIRED before addon enable)
kubectl create secret generic harbor-admin-credentials \
  -n harbor \
  --from-literal=HARBOR_ADMIN_PASSWORD=<password> \
  --from-literal=values.yaml="harborAdminPassword: <password>"

# Enable the addon
vela addon enable ./src/staccato-toolkit/core/assets/addons/harbor

# With custom storage sizing
vela addon enable ./src/staccato-toolkit/core/assets/addons/harbor \
  --set storageSize=50Gi --set dbSize=10Gi
```

## Verification

```bash
# All Harbor pods should be Running
kubectl get pods -n harbor

# Harbor API should respond
kubectl run -it --rm curl --image=curlimages/curl --restart=Never -- \
  curl http://harbor-core.harbor.svc.cluster.local/api/v2.0/ping

# Check Harbor UI (port-forward)
kubectl port-forward svc/harbor -n harbor 8080:80
# → http://localhost:8080  (admin / <your-password>)
```

## OCI Artifact Operations

```bash
# Push a manifest bundle to Harbor (used by staccato bootstrap oci-seed)
flux push artifact oci://harbor-core.harbor.svc.cluster.local/staccato/manifests:bootstrap \
  --source=. --path=.

# List artifacts in Harbor
flux get sources oci -n flux-system
```

## Credential Injection Pattern

Harbor bootstrap uses two credential paths:

1. **harbor-admin-credentials** (harbor namespace) — Harbor admin password for the Helm chart
2. **harbor-oci-credentials** (flux-system namespace) — declarative dockerconfigjson rendered by
   the `st-workloads` addon and mirrored into all namespaces by Reflector

## Key Endpoints (in-cluster)

| Endpoint                                      | Use                                |
| --------------------------------------------- | ---------------------------------- |
| `http://harbor-core.harbor.svc.cluster.local` | Harbor core API and UI             |
| `harbor-core.harbor.svc.cluster.local:80`     | HTTP registry (OCI push/pull)      |
| `harbor-core.harbor.svc.cluster.local:443`    | HTTPS registry (if TLS configured) |

## Rules

- **DO** use `vela addon enable/disable/upgrade` to manage Harbor lifecycle
- **DO** pin the Helm chart version in `template.yaml` (currently `1.16.0`)
- **DO** inject credentials as Secrets before `vela addon enable`
- **DO** use PVC-backed persistence (default StorageClass) — data may be lost on cluster delete in local dev
- **DO NOT** store passwords in addon YAML files
- **DO NOT** enable Trivy vulnerability scanning in local dev (resource-heavy)
- **DO NOT** enable Harbor Notary in local dev
- **DO NOT** use Harbor as a source for Helm chart storage — it is the OCI manifest registry only
