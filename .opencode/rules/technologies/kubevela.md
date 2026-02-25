---
created-by-change: gitops-provider-component
last-validated: 2026-03-01
---

# KubeVela OAM Usage Rules

KubeVela is the platform's application delivery engine based on the Open Application Model (OAM).
It manages both platform infrastructure (via addons) and application workloads (via OAM Applications).

## Core Principle

KubeVela distinguishes two classes of managed resources:

1. **Addons** — platform infrastructure (Harbor, flux-operator). Managed via `vela addon enable/disable/upgrade`.
2. **OAM Applications** — workload orchestration and GitOps declarations. Managed via `kubectl apply` or the OAM API.

Platform operators (Harbor, Flux Operator) MUST be custom addons, NOT inline OAM helm components.
This gives versioned lifecycle management independent of workload applications.

## Addon Authoring Pattern

Each custom addon follows the standard KubeVela structure:

```
assets/addons/<addon-name>/
├── metadata.yaml       # REQUIRED: name, version, description, system, dependencies
├── README.md           # REQUIRED: human-readable description and usage
├── template.yaml       # REQUIRED: KubeVela Application (the addon's workload)
├── parameter.cue       # OPTIONAL: configurable parameters with defaults
└── resources/          # OPTIONAL: supplementary k8s-objects (Namespaces, CRDs, etc.)
    └── <name>.yaml
```

### metadata.yaml Structure

```yaml
name: <addon-name>               # must match directory name
version: <semver>                # pinned semver, no ranges or latest
description: >
  One-paragraph description.
icon: https://...                # optional icon URL
url: https://...                 # project URL
tags:
  - <tag>
dependencies:                    # optional: list of addons that must be enabled first
  - name: <other-addon>
system:
  vela: ">=v1.10.0"
  kubernetes: ">=1.25.0-0"
```

### template.yaml Structure

The `template.yaml` is a standard KubeVela `Application` manifest. Use the `helm` component type
for Helm-chart-backed addons:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: <addon-name>
  namespace: vela-system
spec:
  components:
    - name: <addon-name>
      type: helm
      properties:
        repoType: helm              # or "oci" for OCI charts
        url: https://...           # chart repo URL
        chart: <chart-name>
        version: "<pinned-semver>"
        targetNamespace: <ns>
        releaseName: <release>
        values:
          ...
```

For OCI Helm charts:

```yaml
properties:
  repoType: oci
  url: oci://ghcr.io/<org>/charts
  chart: <chart-name>
  version: "<pinned-semver>"
```

### parameter.cue Structure

```cue
// parameter.cue
parameter: {
  // Description of the parameter.
  paramName: *"default-value" | string
}
```

Reference parameters in `template.yaml` using `{{ parameter.paramName }}`.

## Addon Lifecycle Commands

```bash
# Enable a local addon
vela addon enable ./path/to/addon/

# Enable with parameter overrides
vela addon enable ./path/to/addon/ --set paramName=value

# List enabled addons
vela addon list

# Upgrade an addon
vela addon upgrade ./path/to/addon/

# Disable an addon
vela addon disable <addon-name>
```

## OAM Application Authoring

For thin Applications (like `gitops-provider`) that wrap a single CRD resource, use `k8s-objects`:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: my-app
  namespace: vela-system
spec:
  components:
    - name: my-component
      type: k8s-objects
      properties:
        objects:
          - apiVersion: some.io/v1
            kind: SomeResource
            metadata:
              name: my-resource
              namespace: target-namespace
            spec:
              ...
```

## KubeVela Installation

KubeVela core is installed via the kustomize overlay at:
`src/staccato-toolkit/core/assets/kustomize/overlays/bootstrap/`

The bootstrap devbox provides the `vela` CLI:

```json
// src/staccato-toolkit/core/assets/bootstrap/devbox.json
{
  "packages": ["kubevela@1.10.7"]
}
```

```bash
devbox shell  # provides vela CLI
```

## Rules

- **DO** use custom addons for platform operators (Harbor, Flux Operator, etc.)
- **DO** pin addon versions explicitly in `metadata.yaml` AND `template.yaml`
- **DO** declare addon dependencies via `dependencies:` in `metadata.yaml` — never assume ordering
- **DO** store addon assets under `src/staccato-toolkit/core/assets/addons/<name>/`
- **DO** use `k8s-objects` component type for wrapping CRD resources (not `helm` for simple manifests)
- **DO NOT** use the KubeVela community addon registry for platform operators — use custom local addons
- **DO NOT** hardcode credentials or secrets in addon YAML — inject as Kubernetes Secrets before `vela addon enable`
- **DO NOT** use `latest` or version ranges in addon `metadata.yaml` or `template.yaml`
- **DO NOT** create KubeVela Workflow steps for addon ordering — use the `dependencies` field instead
