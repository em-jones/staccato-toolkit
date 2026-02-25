---
rule: headlamp-kubernetes-ui
layer: kubernetes
created-by-change: kubernetes-ui-tool-selection
last-validated: 2026-02-27
---

# Usage Rules: Headlamp Kubernetes UI

Headlamp is the platform's web-based Kubernetes UI. It complements `k9s` (terminal UI) for
graphical resource browsing, CRD/KubeVela inspection, and onboarding.

## Launching Headlamp

### Preferred: devbox run script

```bash
devbox run ui
```

This launches Headlamp pointing to `$KUBECONFIG` (defaults to `~/.kube/config`).

### Manual launch (outside devbox)

```bash
headlamp-k8s --kubeconfig ~/.kube/config
```

Headlamp serves a web UI at `http://localhost:4466` by default. Open in your browser.

## Prerequisites

- `devbox shell` must be active (provides `headlamp-k8s` binary from Nix)
- A local Kubernetes cluster must be running (e.g., `kind create cluster`)
- `KUBECONFIG` must point to a valid kubeconfig file

## Common Workflows

### Browse cluster resources

1. Run `devbox run ui`
2. Open `http://localhost:4466` in your browser
3. Navigate the left sidebar: Workloads → Pods / Deployments / etc.

### Inspect KubeVela Application CRDs

1. In the Headlamp sidebar, select **Custom Resources**
2. Find `applications.core.oam.dev` under the `core.oam.dev` group
3. Click any `Application` resource to view its spec and status tree

### Inspect ComponentDefinition CRDs

1. Custom Resources → `componentdefinitions.core.oam.dev`
2. Review the capability definitions available in the cluster

### View pod logs

1. Workloads → Pods → select a pod
2. Click the **Logs** tab
3. Use the container selector for multi-container pods

### Port-forward a service

Headlamp does not have a built-in port-forward UI. Use `kubectl` directly:

```bash
kubectl port-forward svc/<name> <local-port>:<remote-port>
```

## Plugin Development

Headlamp supports TypeScript plugins for custom resource views. To scaffold a plugin:

```bash
npx @kinvolk/headlamp-plugin create my-plugin
```

See [Headlamp plugin docs](https://headlamp.dev/docs/latest/development/plugins/) for the API.

## Fallback: Binary Install (if Nix package unavailable)

```bash
# Linux amd64
curl -L https://github.com/headlamp-k8s/headlamp/releases/latest/download/headlamp-linux-amd64 \
  -o ~/.local/bin/headlamp-k8s && chmod +x ~/.local/bin/headlamp-k8s
```

Check [GitHub releases](https://github.com/headlamp-k8s/headlamp/releases) for the latest version.

## Do Not

- Do not install cluster-side Headlamp agents unless you explicitly want in-cluster deployment
  (not required for local dev)
- Do not use Headlamp as a substitute for `kubectl` for scripting or CI — use `kubectl` directly
- Do not use Headlamp for RBAC editing in production clusters without a review process

## Related

- `k9s` — terminal UI for power users (always available in devbox)
- `kubectl` — standard CLI; prerequisite for all cluster interaction
- ADR: `docs/adr/0024-kubernetes-ui-headlamp.md`
