---
created-by-change: ops-environment-render-workflow
last-validated: 2026-03-03
---

# Dagger Cloud Usage Rules

Dagger Cloud is the hosted Dagger engine service. It provides a remote execution
environment for Dagger pipelines — the Dagger CLI connects to Dagger Cloud instead
of running an engine locally or in CI. On this platform, Dagger Cloud is the engine
used by in-cluster render Jobs spawned by KubeVela Application workflows.

## When to Use Dagger Cloud

Use Dagger Cloud when a Dagger pipeline must run **inside a Kubernetes Pod** (no local
Docker daemon, no privileged containers). The Dagger CLI in the Pod connects to the
cloud engine; all containers (kustomize, helm, flux-cli, etc.) execute remotely.

Do NOT use Dagger Cloud for local development — use the local Dagger engine (default
when `DAGGER_CLOUD_TOKEN` is absent). Do NOT deploy an in-cluster Dagger engine
DaemonSet — Dagger Cloud eliminates that operational burden.

## Authentication

Dagger Cloud requires a `DAGGER_CLOUD_TOKEN` environment variable. On this platform
the token is stored as a Kubernetes Secret named `dagger-cloud-token` in the
`vela-system` namespace.

**Create the secret during bootstrap (before applying any ops-environment Application):**

```bash
kubectl create secret generic dagger-cloud-token \
  --namespace vela-system \
  --from-literal=token=<DAGGER_CLOUD_TOKEN>
```

The secret key MUST be `token`. The `render-manifests` WorkflowStepDefinition
hardcodes the secret name `dagger-cloud-token` and key `token`.

## In-Cluster Job Pattern

The render Job container image MUST contain only the Dagger CLI. Tool images
(kustomize, helm, flux-cli) are provisioned by the Dagger Cloud engine — they
must NOT be added to the Job image.

```yaml
containers:
  - name: dagger
    image: ghcr.io/dagger/dagger:v0.19.11 # dagger CLI only
    env:
      - name: DAGGER_CLOUD_TOKEN
        valueFrom:
          secretKeyRef:
            name: dagger-cloud-token
            key: token
    command:
      - dagger
      - call
      - --mod
      - github.com/em-jones/staccato-toolkit/src/ops/workloads
      - render
      - ...
```

## Module Reference

When invoking `dagger call --mod` from a Kubernetes Job, always pin the module
reference to the same SHA being rendered:

```
github.com/em-jones/staccato-toolkit/src/ops/workloads
```

The `render-manifests` WorkflowStepDefinition hardcodes this module path. To pin
to a specific version, append `@<sha>` — e.g.:

```
github.com/em-jones/staccato-toolkit/src/ops/workloads@abc1234
```

## Caching

Dagger Cloud caches container layers across invocations. The `kustomizeContainer`
function installs helm and kustomize in a single layer that is reused by subsequent
renders, provided the same Dagger Cloud organisation is used.

## See Also

- [Dagger usage rules](./dagger.md) — Go SDK, local development, CI patterns
- [devops-automation skill](../../skills/devops-automation/SKILL.md) — render and publish-module task reference
- [render-manifests WorkflowStepDefinition](../../../src/staccato-toolkit/core/assets/addons/st-workloads/definitions/render-manifests.cue)
