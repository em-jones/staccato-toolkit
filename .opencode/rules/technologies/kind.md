---
created-by-change: kubernetes-dev-environment
last-validated: 2026-02-25
---

# kind (Kubernetes in Docker) Usage Rules

kind is a tool for running local Kubernetes clusters using Docker container "nodes". It was primarily designed for testing Kubernetes itself, but is widely adopted for local development and CI testing. kind provides a fast, lightweight Kubernetes environment with full upstream API compatibility.

## Core Principle

kind is the standard for local Kubernetes development clusters. All development clusters MUST use the naming convention `staccato-dev`. Every kind cluster MUST be created from a declarative `kind-config.yaml`. Local container images MUST be loaded via `kind load docker-image` rather than pushing to a registry. All kubectl commands targeting the dev cluster MUST use `--context kind-staccato-dev`.

## Setup

kind is available in the development environment via `devbox.json`. The cluster configuration lives at `src/ops/dev/kind-config.yaml`.

### Installation (local development)

kind is already included in the Devbox environment:

```bash
devbox shell
kind --version
```

### Cluster configuration

The `kind-config.yaml` defines the cluster topology and port mappings:

```yaml
# src/ops/dev/kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: staccato-dev
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30080
        hostPort: 80
        protocol: TCP
      - containerPort: 30443
        hostPort: 443
        protocol: TCP
```

**Key configuration points**:
- `name: staccato-dev` — cluster name convention
- Single control-plane node — sufficient for dev
- Port mappings — expose NodePort services (30080→80, 30443→443)
- No extra mounts — images loaded via `kind load`, not volume mounts

### Creating the cluster

```bash
kind create cluster --config src/ops/dev/kind-config.yaml
```

**Expected outcome**:
- Cluster created in ~30 seconds
- Kubeconfig automatically updated with context `kind-staccato-dev`
- Docker container `staccato-dev-control-plane` running

## Key Guidelines

### Cluster Naming Convention

All development clusters MUST use the name `staccato-dev`:

```bash
# ✓ Good
kind create cluster --config src/ops/dev/kind-config.yaml --name staccato-dev

# ✗ Avoid
kind create cluster --name my-test-cluster
```

**Rationale**: Consistent naming simplifies Taskfile automation and kubectl context switching. All automation assumes `--context kind-staccato-dev`.

### kind-config.yaml Pattern

Every kind cluster MUST be created from a declarative configuration file:

```bash
# ✓ Good
kind create cluster --config src/ops/dev/kind-config.yaml

# ✗ Avoid
kind create cluster --name staccato-dev
```

**Rationale**: Declarative config ensures reproducibility. Port mappings, node labels, and feature gates are version-controlled and consistent across all developers.

### Loading Local Images

Local container images MUST be loaded via `kind load docker-image`:

```bash
# ✓ Good
docker build -t staccato-server:dev .
kind load docker-image staccato-server:dev --name staccato-dev

# ✗ Avoid
docker push localhost:5000/staccato-server:dev  # Requires local registry
```

**Key points**:
- `kind load` copies the image directly into the cluster's containerd storage
- No local registry required
- Images must exist in local Docker daemon before loading
- Use `imagePullPolicy: Never` in Kubernetes manifests for loaded images

**Scenario: Load multiple images**:

```bash
# Build images
docker build -t staccato-server:dev -f src/staccato-server/Dockerfile .
docker build -t staccato-cli:dev -f src/staccato-cli/Dockerfile .

# Load into kind cluster
kind load docker-image staccato-server:dev staccato-cli:dev --name staccato-dev
```

### kubectl Context Convention

All kubectl commands targeting the dev cluster MUST use `--context kind-staccato-dev`:

```bash
# ✓ Good
kubectl get pods --context kind-staccato-dev -n staccato

# ✗ Avoid
kubectl get pods -n staccato  # Assumes current context
```

**Rationale**: Explicit context prevents accidental commands against production clusters. Automation scripts MUST always specify `--context`.

**Scenario: Switch default context for interactive use**:

```bash
# For interactive kubectl sessions
kubectl config use-context kind-staccato-dev

# Verify current context
kubectl config current-context
# Output: kind-staccato-dev
```

### Cluster Teardown

Clean up the cluster with `kind delete cluster`:

```bash
kind delete cluster --name staccato-dev
```

**Expected outcome**:
- Docker container `staccato-dev-control-plane` removed
- Kubeconfig context `kind-staccato-dev` removed
- All cluster data lost (ephemeral dev environment)

**Important**: kind clusters are ephemeral. All data is lost on teardown. This is expected behaviour for dev environments.

### CI Usage Pattern

kind is ideal for CI testing because it runs in Docker without VM overhead:

```bash
# CI pipeline example
kind create cluster --config src/ops/dev/kind-config.yaml --wait 5m
kind load docker-image my-app:$CI_COMMIT_SHA --name staccato-dev
kubectl apply -f manifests/ --context kind-staccato-dev
kubectl rollout status deployment/my-app --context kind-staccato-dev
kind delete cluster --name staccato-dev
```

**Key points**:
- `--wait 5m` ensures cluster is fully ready before proceeding
- Load images built in the same pipeline
- Clean up with `kind delete` at pipeline end
- kind is supported in GitHub Actions, GitLab CI, and most CI platforms

## Common Issues

**"ERROR: failed to create cluster: node(s) already exist for a cluster with the name 'staccato-dev'"**
→ A cluster with this name already exists. Delete it first: `kind delete cluster --name staccato-dev`, then recreate.

**"image: 'staccato-server:dev' not present locally"**
→ The image must exist in the local Docker daemon before loading. Run `docker build` first, then `kind load docker-image`.

**"pod pending: ImagePullBackOff"**
→ The image is not loaded in the kind cluster, or `imagePullPolicy` is set to `Always`. Use `kind load docker-image` and set `imagePullPolicy: Never` in the manifest.

**"port 80 already in use"**
→ Another process (or another kind cluster) is using port 80. Stop the conflicting process or change the `hostPort` in `kind-config.yaml`.

**"How do I access services running in kind?"**
→ Use `kubectl port-forward` for development: `kubectl port-forward svc/my-service 8080:80 --context kind-staccato-dev`. For NodePort services, use the mapped host ports (80, 443) defined in `kind-config.yaml`.

**"kind cluster is slow on my machine"**
→ kind requires Docker Desktop with adequate resources. Allocate at least 4 CPUs and 8GB RAM to Docker. Check Docker Desktop settings.

**"How do I debug pods in kind?"**
→ Use `kubectl logs`, `kubectl exec`, or ephemeral debug containers. kind clusters behave like any Kubernetes cluster. See [kubectl documentation](./k8s.md#kubectl) for debugging patterns.

## See Also

- [kubectl Usage Rules](./k8s.md#kubectl) - kubectl patterns for dev cluster interaction
- [Helm Usage Rules](./helm.md) - Helm chart deployment in kind clusters
- [Devops Automation Skill](../../skills/devops-automation/SKILL.md) - Taskfile workflows for `task dev-up` and `task dev-down`
- [kind Official Documentation](https://kind.sigs.k8s.io/) - Comprehensive kind reference
- [kind Quick Start](https://kind.sigs.k8s.io/docs/user/quick-start/) - Getting started guide
