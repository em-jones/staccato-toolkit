# st-workloads-bootstrap

Helm chart that installs KubeVela core and the `st-workloads` addon into a Kubernetes cluster.

The `st-workloads` addon provisions the full GitOps bootstrap stack:

| Component | Namespace | Notes |
|---|---|---|
| KubeVela core | `vela-system` | Controller + CRDs, installed as a subchart |
| flux-operator | `flux-system` | ControlPlane Flux Operator v0.43.0 |
| Harbor | `harbor` | OCI registry + Trivy, clusterIP, no TLS (dev defaults) |
| Reflector | `reflector` | Mirrors `harbor-oci-credentials` into all namespaces |
| `harbor-oci-credentials` | `flux-system` | Declarative dockerconfigjson Secret with reflector auto-mirror annotations |

## Prerequisites

- Kubernetes 1.25+
- Helm 3.8+
- A running cluster (kind, k3s, or any conformant distribution)

## Quick Start

```bash
# 1. Fetch chart dependencies (kubevela/vela-core subchart)
helm dependency build charts/st-workloads-bootstrap

# 2. Install
helm install st-workloads-bootstrap charts/st-workloads-bootstrap \
  --namespace vela-system \
  --create-namespace \
  --wait

# 3. Run tests
helm test st-workloads-bootstrap --namespace vela-system --timeout 10m
```

## Upgrade

```bash
# Re-sync the addon bundle before upgrading (picks up addon changes)
bash hack/sync-st-workloads-chart.sh

helm upgrade st-workloads-bootstrap charts/st-workloads-bootstrap \
  --namespace vela-system
```

## What Happens During Install

1. **Subchart installs KubeVela core** — `vela-core` Deployment in `vela-system`.
2. **Helm post-install hook Job** runs:
   - Waits for KubeVela controller to be `Ready`.
   - Extracts the `st-workloads` addon from a bundled Secret.
   - Runs `vela addon enable /work/st-workloads -s`.
   - The addon applies its OAM Application (`template.yaml`), which creates:
     - The `flux-system`, `harbor`, and `reflector` namespaces.
     - All Reflector, flux-operator, and Harbor manifests from `bootstrap-manifests`.
     - The declarative `harbor-oci-credentials` Secret in `flux-system` with
       Reflector auto-mirror annotations so the credentials propagate
       into every namespace automatically.

## Helm Tests

Run after install to validate the deployment:

```bash
helm test st-workloads-bootstrap --namespace vela-system --timeout 10m
```

The test Pod runs five checks:

| # | Check |
|---|-------|
| 1 | `harbor-core` Deployment is Ready in the `harbor` namespace |
| 2 | `harbor-oci-credentials` in `flux-system` has correct reflector annotations |
| 3 | `reflector` Deployment is Ready in the `reflector` namespace |
| 4 | `flux-operator` Deployment is Ready in the `flux-system` namespace |
| 5 | `harbor-oci-credentials` is reflected into a freshly created namespace within 60 s |

## Configuration

| Key | Default | Description |
|---|---|---|
| `kubevela.enabled` | `true` | Install KubeVela via the `vela-core` subchart |
| `kubevela.vela-core.*` | — | Values forwarded to the `vela-core` subchart |
| `addon.enabled` | `true` | Run the st-workloads addon installer Job |
| `addon.job.image` | `oamdev/vela-cli:v1.10.7` | Image providing `vela` CLI + `kubectl` |
| `addon.job.imagePullPolicy` | `IfNotPresent` | Image pull policy |
| `addon.job.activeDeadlineSeconds` | `600` | Job timeout (seconds) |
| `addon.job.velaReadyTimeoutSeconds` | `300` | Seconds to wait for KubeVela readiness |
| `addon.job.extraEnv` | `[]` | Extra env vars injected into the installer container |
| `addon.bundleSecretName` | `st-workloads-addon-bundle` | Secret name for the addon tarball |

## Updating the Addon Bundle

The addon source lives in
`src/staccato-toolkit/control-plane-orch/assets/kubevela/addons/st-workloads/`.

After changing the addon, regenerate `charts/st-workloads-bootstrap/files/st-workloads.tgz`:

```bash
bash hack/sync-st-workloads-chart.sh
```

Then upgrade the chart as shown above.

## Uninstall

```bash
helm uninstall st-workloads-bootstrap --namespace vela-system
```

> Note: the `st-workloads-addon-bundle` Secret has `helm.sh/resource-policy: keep`.
> Delete it manually if you want a fully clean removal:
> `kubectl delete secret st-workloads-addon-bundle -n vela-system`
