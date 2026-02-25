---
created-by-change: kubernetes-dev-environment
last-validated: 2026-02-25
---

# Kubernetes Usage Rules

Comprehensive rules for Kubernetes tooling in this platform, covering cluster management, development workflows, manifest linting, and application delivery.

## Table of Contents

- [kubectl](#kubectl)
  - [Core Principle](#core-principle)
  - [Setup](#setup)
  - [Key Guidelines](#key-guidelines)
  - [Common Issues](#common-issues)
- [k9s (Terminal UI)](#k9s-terminal-ui)
  - [Core Principle](#core-principle-1)
  - [Key Guidelines](#key-guidelines-1)
  - [Common Issues](#common-issues-1)
- [KubeLinter (Manifest Linting)](#kubelinter-manifest-linting)
  - [Core Principle](#core-principle-2)
  - [Setup](#setup-1)
  - [Key Guidelines](#key-guidelines-2)
  - [Common Issues](#common-issues-2)
- [Skaffold (Continuous Development)](#skaffold-continuous-development)
  - [Usage Standards](#usage-standards)
- [KubeVela (Application Delivery)](#kubevela-application-delivery)
  - [Core Concepts](#core-concepts)
  - [Application Structure](#application-structure)
  - [Key Patterns](#key-patterns)
  - [Best Practices](#best-practices)
  - [Common Pitfalls](#common-pitfalls)
  - [CLI Commands](#cli-commands)
- [See Also](#see-also)

---

## kubectl

kubectl is the official command-line tool for interacting with Kubernetes clusters. For automation and scripting, prefer `kubectl` with `-o yaml` and pipe through `yq` for YAML processing.

### Core Principle

kubectl is the standard CLI for all Kubernetes operations in development and debugging. All commands targeting the dev cluster MUST use `--context kind-staccato-dev` to prevent accidental operations against production clusters. Namespace conventions are `monitoring` for observability stack components and `staccato` for application workloads. Prefer `kubectl apply -f` for declarative deployments; use Helm for complex applications.

### Setup

kubectl is available in the development environment via `devbox.json`. The kubeconfig is automatically updated when creating kind clusters.

```bash
devbox shell
kubectl version --client

# Verify context
kubectl config current-context
# Expected: kind-staccato-dev
```

### Key Guidelines

#### Context Convention

All kubectl commands targeting the dev cluster MUST use `--context kind-staccato-dev`:

```bash
# ✓ Good - explicit context
kubectl get pods --context kind-staccato-dev -n staccato

# ✗ Avoid - relies on current context
kubectl get pods -n staccato
```

For interactive sessions, set the default context:

```bash
kubectl config use-context kind-staccato-dev
```

#### Namespace Conventions

- `monitoring` — all observability stack components (Prometheus, Grafana, Loki, Tempo, OTel Collector)
- `staccato` — application workloads (staccato-server, staccato-cli)

```bash
kubectl get pods -n monitoring --context kind-staccato-dev
kubectl get pods -n staccato --context kind-staccato-dev
```

#### Declarative Deployment: kubectl apply vs Helm

- **kubectl apply**: Single service, simple ConfigMap/Secret, < 5 resources
- **Helm**: Multi-component stack, parameterized configuration, > 5 resources

```bash
# ✓ Good - kubectl apply for simple manifests
kubectl apply -f src/ops/dev/manifests/otel-collector.yaml --context kind-staccato-dev

# ✓ Good - Helm for complex charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --kube-context kind-staccato-dev \
  --values src/ops/observability/prometheus-values.yaml
```

#### Port Forwarding

```bash
# ✓ Good - port-forward service (preferred over pod)
kubectl port-forward svc/grafana 3000:80 -n monitoring --context kind-staccato-dev
kubectl port-forward svc/staccato-server 8080:8080 -n staccato --context kind-staccato-dev

# ✗ Avoid - hardcoded pod name (pods are ephemeral)
kubectl port-forward pod/staccato-server-7d8f5c9b4-abc 8080:8080 -n staccato --context kind-staccato-dev
```

#### Deployment Verification

Always verify deployments with `kubectl rollout status`:

```bash
kubectl apply -f src/ops/dev/manifests/staccato-server.yaml --context kind-staccato-dev
kubectl rollout status deployment/staccato-server -n staccato --context kind-staccato-dev --timeout=5m

# If rollout fails
kubectl get pods -n staccato --context kind-staccato-dev
kubectl describe pod <pod-name> -n staccato --context kind-staccato-dev
```

#### Debugging Logs

```bash
kubectl logs -f deployment/staccato-server -n staccato --context kind-staccato-dev
kubectl logs --tail=100 deployment/staccato-server -n staccato --context kind-staccato-dev
kubectl logs --previous pod/staccato-server-7d8f5c9b4-xyz -n staccato --context kind-staccato-dev
```

#### Ephemeral Debug Containers for Distroless Images

Distroless containers have no shell. Use ephemeral debug containers for debugging:

```bash
# ✓ Good - ephemeral debug container
kubectl debug -it pod/staccato-server-7d8f5c9b4-xyz -n staccato --context kind-staccato-dev \
  --image=busybox:1.36 \
  --target=staccato-server

# ✗ Avoid - kubectl exec fails on distroless
kubectl exec -it pod/staccato-server-7d8f5c9b4-xyz -- /bin/sh
```

#### Resource Inspection

```bash
# Get all resources in a namespace
kubectl get all -n staccato --context kind-staccato-dev

# Describe resource for events
kubectl describe pod <pod-name> -n staccato --context kind-staccato-dev

# Get resource YAML
kubectl get pod <pod-name> -n staccato --context kind-staccato-dev -o yaml | yq

# Watch resources
kubectl get pods -n staccato --context kind-staccato-dev --watch

# Restart deployment
kubectl rollout restart deployment/<name> -n <namespace> --context kind-staccato-dev

# Scale deployment
kubectl scale deployment/<name> --replicas=3 -n <namespace> --context kind-staccato-dev
```

### Common Issues

**"error: You must be logged in (Unauthorized)"**
→ `kind get clusters`, then `kind export kubeconfig --name staccato-dev`.

**"the server doesn't have a resource type 'pods'"**
→ Check Docker: `docker ps | grep staccato-dev-control-plane`. Restart cluster if needed.

**"pod pending: ImagePullBackOff"**
→ `kind load docker-image <image>:<tag> --name staccato-dev`. Ensure `imagePullPolicy: Never` for local images.

**"kubectl exec: container has no shell"**
→ Use ephemeral debug containers: `kubectl debug -it pod/<pod-name> -n <namespace> --context kind-staccato-dev --image=busybox:1.36 --target=<container-name>`.

**"deployment rollout stuck at 0/1 replicas"**
→ `kubectl describe pod <pod-name>`. Common causes: image pull errors, resource limits, failed health checks, missing ConfigMaps/Secrets.

---

## k9s (Terminal UI)

k9s is a terminal-based UI for managing Kubernetes clusters. It is the recommended tool for local cluster inspection and debugging.

### Core Principle

k9s is the standard terminal UI for Kubernetes cluster management during local development and debugging. Use k9s for interactive exploration, log viewing, and resource inspection. For automation and CI/CD, use kubectl instead.

### Key Guidelines

```bash
# Start k9s (uses current kubectl context)
k9s

# Start k9s with specific namespace
k9s -n staccato

# Start k9s with specific context
k9s --context kind-staccato-dev
```

**Keyboard shortcuts:**
- `:pod` — View pods
- `:svc` — View services
- `:deploy` — View deployments
- `l` — View logs for selected resource
- `d` — Describe selected resource
- `e` — Edit selected resource
- `s` — Shell into pod
- `/` — Filter resources
- `0` — Toggle log timestamps
- `w` — Toggle log wrapping

**k9s is for interactive use only.** Use kubectl in scripts and CI/CD:

```bash
# ✗ Avoid: k9s in scripts (not supported)
k9s -c pod -n default

# ✓ Good: kubectl in scripts
kubectl get pods -n default
```

### Common Issues

**"k9s shows no resources"**
→ Check kubectl context: `kubectl config current-context`.

**"k9s crashes or freezes"**
→ Update to latest: `brew upgrade k9s`. Check cluster connectivity.

**"Cannot find specific resource type"**
→ Use `:` to search (e.g., `:configmap`, `:secret`, `:ingress`).

---

## KubeLinter (Manifest Linting)

KubeLinter is a static analysis tool for Kubernetes YAML files and Helm charts. It checks manifests against best practices with a focus on production readiness and security.

### Core Principle

KubeLinter is the standard manifest linter for all Kubernetes YAML files in `src/ops/`. Every manifest MUST pass kube-linter checks before merge. The `default` check set is enabled by default, covering ~40 checks for security, reliability, and configuration correctness. Checks that cannot be satisfied MUST be suppressed in `.kube-linter.yaml` with a documented `# reason:` comment.

### Setup

KubeLinter runs in CI via the Dagger pipeline's `LintManifests` task. No local installation is required for development.

```bash
# Local installation (optional)
brew install kube-linter       # macOS
go install golang.stackrox.io/kube-linter/cmd/kube-linter@latest  # Linux

# Run via Dagger (matches CI exactly)
dagger call lint-manifests --source ../..
```

### Key Guidelines

#### Configuration File

`.kube-linter.yaml` at the repository root MUST be committed to version control:

```yaml
# .kube-linter.yaml — minimal (enables default checks)
checks:
  doNotAutoAddDefaults: false
```

With exclusions:

```yaml
checks:
  doNotAutoAddDefaults: false
  exclude:
    # reason: Helm-rendered templates cannot be linted at authoring time
    - "no-read-only-root-fs"
```

#### Default Check Set

~40 built-in checks covering:
- **Security**: no root user, no privilege escalation, no hostPID/hostNetwork, read-only root filesystem
- **Reliability**: resource limits set, liveness/readiness probes configured
- **Configuration**: valid image tags (no `latest`), no deprecated APIs

```bash
# See all default checks
kube-linter checks list

# See which checks are enabled for your config
kube-linter lint --config .kube-linter.yaml --print-checks-enabled <manifest>
```

#### Suppressing Checks

Every exclusion MUST include a `# reason:` comment:

```yaml
checks:
  exclude:
    # reason: Application writes logs to /var/log; read-only root fs not feasible
    - "no-read-only-root-fs"

    # reason: Liveness probe not applicable to one-shot Job workloads
    - "no-liveness-probe"
```

**Rules for suppressions:**
- Prefer fixing the manifest over suppressing
- Review suppressions quarterly
- Document risk acceptance for security check suppressions

#### Running Locally

```bash
# Lint a single file
kube-linter lint --config .kube-linter.yaml src/ops/dev/manifests/staccato-server/deployment.yaml

# Lint a directory
kube-linter lint --config .kube-linter.yaml src/ops/dev/manifests/

# Lint via Dagger (matches CI behavior exactly)
dagger call lint-manifests --source ../..
```

#### CI Integration

```yaml
manifest-lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Lint Kubernetes manifests
      run: dagger call lint-manifests --source ../..
      working-directory: ./src/ops/workloads
```

### Common Issues

**"Error: no objects found"**
→ Verify path contains valid YAML files with Kubernetes `kind:` fields.

**"Linter passes locally but fails in CI"**
→ Use the same `.kube-linter.yaml` locally and in CI. Run `dagger call lint-manifests` to match CI exactly.

**"Can I lint Helm charts?"**
→ Render first: `helm template <chart> | kube-linter lint --stdin`.

---

## Skaffold (Continuous Development)

Skaffold facilitates continuous development for Kubernetes applications by automating the build, push, and deploy workflow during local development and CI/CD.

### Usage Standards

- Define profiles for different environments (dev, staging, production)
- Use `skaffold dev` for local development with file watching and auto-deploy
- Use `skaffold run` for one-off deployments in CI/CD
- Store `skaffold.yaml` at the repository root or component root
- Pin exact image versions in manifests; use Skaffold variable substitution for dynamic tags
- Use Skaffold's built-in image tagging strategies (`gitCommit`, `dateTime`) for reproducibility

---

## KubeVela (Application Delivery)

KubeVela is a modern application delivery and management control plane built on Kubernetes and the Open Application Model (OAM). It provides declarative, programmable workflows for deploying and operating applications across hybrid/multi-cloud environments.

### Core Concepts

- **Application**: Top-level deployment unit containing components, traits, policies, and workflow
- **Component**: Deployable artifact (container, Helm chart, Terraform module, K8s manifest, CUE config)
- **Trait**: Operational capability attached to components (scaling, routing, monitoring)
- **Policy**: Application-wide strategy (multi-cluster topology, security, SLO)
- **Workflow**: Declarative delivery process with steps (approval, deploy, notification)
- **Definitions**: Programmable building blocks using CUE for templating (`ComponentDefinition`, `TraitDefinition`, `PolicyDefinition`, `WorkflowStepDefinition`)

### Application Structure

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: <app-name>
  namespace: <namespace>
spec:
  components:
    - name: <component-name>
      type: <component-type>
      properties:
        <type-specific-params>
      traits:
        - type: <trait-type>
          properties:
            <trait-params>
  policies:
    - name: <policy-name>
      type: <policy-type>
      properties:
        <policy-params>
  workflow:
    mode:
      steps: StepByStep
      subSteps: DAG
    steps:
      - name: <step-name>
        type: <step-type>
        properties:
          <step-params>
```

### Key Patterns

**Component Types (Built-in):**
- `webservice` — long-running containerized services with Deployment
- `worker` — backend processing without external traffic
- `task` — one-time Job execution
- `cron-task` — CronJob for scheduled tasks
- `daemon` — DaemonSet for node-level services
- `helm` — Helm chart deployment (FluxCD addon)
- `k8s-objects` — raw Kubernetes manifests (Kustomize)

**Common Traits:**
- `scaler` — manual replica management
- `cpuscaler` — HPA based on CPU utilization
- `ingress` — expose HTTP/HTTPS services
- `gateway` — advanced routing with HTTPRoute
- `labels`/`annotations` — add metadata
- `env` — inject environment variables

**Workflow Execution:**
- Steps execute sequentially by default (StepByStep)
- SubSteps execute in parallel (DAG) within step-groups
- Use `dependsOn: [step-name]` for explicit ordering
- Use `if: <condition>` for conditional execution
- Use `suspend` step for manual approval points

### Best Practices

**Application Design:**
- Single responsibility: one primary service per application, max ~15 components total
- Use immutable config: ConfigMaps/Secrets, not baked-in values
- One workflow per environment promotion path

**Definition Development (CUE):**
- Read existing definitions before creating new ones
- Leverage CUE's constraint system for parameter validation
- Use `context` variable for runtime metadata (namespace, name, cluster)
- Validate with `cue vet` before deploying definitions

**Multi-Cluster Operations:**
- Use label selectors in `topology` policy, not hardcoded cluster names
- Deploy to test clusters first, then production
- Mark control-plane-only resources with `controlPlaneOnly: true`

### Common Pitfalls

- **Configuration Drift**: KubeVela maintains desired state; manual K8s edits will be reverted
- **Trait Conflicts**: Check `spec.conflictsWith` in TraitDefinition
- **Missing Addons**: Verify required addons installed before using specialized components
- **CUE Syntax Errors**: Validate with `cue vet` before deploying definitions

**Troubleshooting:**
- `vela status <app-name>` — detailed component/workflow state
- `vela workflow logs <app-name>` — workflow execution logs
- `vela def get <def-name>` — inspect installed definitions

### CLI Commands

```bash
# Application management
vela up -f app.yaml              # Deploy application
vela status <app-name>           # Check application status
vela delete <app-name>           # Delete application
vela logs <app-name>             # View application logs

# Workflow control
vela workflow suspend <app>      # Pause workflow
vela workflow resume <app>       # Resume workflow
vela workflow restart <app>      # Restart workflow

# Definition management
vela def list                    # List all definitions
vela def get <def-name>          # Show definition details
vela def apply -f def.yaml       # Apply custom definition

# Addon management
vela addon list
vela addon enable <addon>
vela addon disable <addon>

# Multi-cluster
vela cluster list
vela cluster join <cluster.kubeconfig>
```

**When NOT to use KubeVela:**
- Simple single-app deployments (plain Kubernetes manifests may suffice)
- Existing mature CD pipeline (ArgoCD/Flux) that meets needs
- No multi-cluster/hybrid-cloud requirements
- Team unfamiliar with CUE

---

## See Also

- [kind Usage Rules](./kind.md) - kind cluster setup and image loading patterns
- [Helm Usage Rules](./helm.md) - Helm chart deployment workflows
- [Distroless Usage Rules](./distroless.md) - Distroless container patterns and debugging
- [Devops Automation Skill](../../skills/devops-automation/SKILL.md) - Taskfile workflows
- [yq Usage Rules](./yq.md) - YAML processing for Kubernetes manifests
- [kubectl Official Documentation](https://kubernetes.io/docs/reference/kubectl/)
- [KubeLinter Documentation](https://docs.kubelinter.io/)
- [KubeVela Documentation](https://kubevela.io/docs/)
