---
td-board: kubernetes-dev-environment
td-issue: td-567b55
status: accepted
date: 2026-02-25
decision-makers:
  - platform-architect
component:
  - src/ops/workloads
tech-radar:
  - name: kind
    quadrant: Infrastructure
    ring: Adopt
    description: Zero-cloud-cost local Kubernetes; standard for CI and dev cluster parity
    moved: 0
  - name: k3d
    quadrant: Infrastructure
    ring: Assess
    description: Lighter alternative to kind; monitor for full API compatibility
      improvements
    moved: 0
  - name: minikube
    quadrant: Infrastructure
    ring: Hold
    description: Heavier than kind for single-node dev; inconsistent Docker driver behaviour
    moved: 0
---

# Design: Kubernetes Development Environment

## Context and problem statement

There is no local Kubernetes cluster. The observability stack configuration exists in `src/ops/observability/`, staccato-server and staccato-cli images will be produced by `instrument-services-with-observability`, but there is nowhere to run them. This change creates a reproducible local dev cluster and deploys everything onto it so the full telemetry pipeline is observable end-to-end.

## Decision criteria

- **Zero cloud cost** (35%): Fully local, no cloud account required
- **Parity with production topology** (30%): Same Helm charts, same namespaces, same service discovery as production would use
- **Fast iteration** (20%): `task dev-up` → working cluster in < 5 minutes on a typical dev machine
- **Minimal footprint** (15%): Single node, resource limits set for laptop-class hardware

Explicitly excludes:

- Production cluster provisioning (separate concern)
- Multi-node HA setup — single node kind is sufficient for dev
- Cloud-based dev environments (Codespaces, Gitpod) — may adopt later

## Considered options

### Option 1: kind (Kubernetes in Docker) — Selected

`kind` runs Kubernetes nodes as Docker containers. Single binary, no VM required, supports loading local images directly via `kind load docker-image`. Widely used for CI testing.

**Why selected**: no VM overhead, loads local images without a registry, fast cluster creation (~30s), clean teardown, supported in GitHub Actions.

### Option 2: k3d (k3s in Docker)

`k3d` wraps k3s (lightweight Kubernetes) in Docker. Even lighter than kind, faster startup.

**Why not selected**: k3s omits some standard Kubernetes APIs that the observability stack Helm charts depend on. kind uses full upstream Kubernetes, eliminating compatibility surprises.

### Option 3: minikube

`minikube` supports multiple drivers (Docker, VirtualBox, hyperkit). Mature, well-documented.

**Why not selected**: heavier than kind for single-node dev use; Docker driver behaviour differs from kind; `kind load` pattern is simpler than minikube's image loading.

## Decision outcome

**Cluster**: `kind` with config at `src/ops/dev/kind-config.yaml`
- Cluster name: `staccato-dev`
- Single control-plane node
- Port mappings: 80→30080, 443→30443 (for NodePort ingress)
- Extra mounts: none needed (images loaded via `kind load`)

**Namespaces**:
- `monitoring` — all observability stack components
- `staccato` — staccato-server, staccato-cli

**Helm deployment order** (in `task dev-up`):
1. `helm repo add` for prometheus-community, grafana
2. `kubectl create namespace monitoring staccato`
3. `helm upgrade --install kube-prometheus-stack` (includes Grafana)
4. `helm upgrade --install loki grafana/loki-stack`
5. `helm upgrade --install tempo grafana/tempo`
6. `kubectl apply` OTel Collector ConfigMap + DaemonSet
7. `kind load docker-image staccato-server:dev staccato-cli:dev`
8. `kubectl apply -f src/ops/dev/manifests/`
9. `kubectl rollout status` for all deployments

**OTel Collector config**: `src/ops/dev/otel-collector-config.yaml`
- Receivers: `otlp` (grpc:4317, http:4318)
- Processors: `batch`, `memory_limiter`
- Exporters: `otlp/tempo` (tempo:4317), `prometheusremotewrite` (prometheus:9090), `loki` (loki:3100)

**Taskfile tasks**:
- `dev-up`: full cluster + stack + services
- `dev-down`: `kind delete cluster --name staccato-dev`
- `dev-status`: `kubectl get pods -A`
- `dev-grafana`: port-forward Grafana to :3000
- `dev-server`: port-forward staccato-server to :8080

## Risks / trade-offs

- Risk: Resource pressure on laptop (Prometheus + Loki + Tempo + Grafana is ~2GB RAM) → Mitigation: set Helm values resource limits; document minimum 8GB RAM requirement
- Risk: kind cluster state lost on machine restart → Mitigation: `task dev-up` is idempotent; document this expected behaviour
- Risk: kind image loading is slow for large images → Mitigation: keep staccato images small (distroless); document `kind load` as the loading pattern
- Trade-off: No persistent volumes in kind → observability data is ephemeral; acceptable for dev

## Migration plan

1. Add `kind`, `kubectl`, `helm` to `devbox.json`
2. Write `src/ops/dev/kind-config.yaml`
3. Write OTel Collector ConfigMap at `src/ops/dev/otel-collector-config.yaml`
4. Write Kubernetes manifests at `src/ops/dev/manifests/`
5. Extend `Taskfile.yaml` with `dev-up`, `dev-down`, `dev-status`, `dev-grafana`, `dev-server`
6. Run `task dev-up` end-to-end; validate all pods Running; validate Grafana shows staccato metrics

**Prerequisite**: `instrument-services-with-observability` change must be complete (images must exist).

## Confirmation

- Test cases: `task dev-up` completes without error; all pods `Running`; `curl localhost:8080/healthz` returns 200; Grafana Explore shows logs and traces from staccato-server
- Metrics: cluster provisions in < 5 minutes on 8GB RAM machine
- Acceptance criteria: end-to-end telemetry pipeline working — request → trace in Tempo, log in Loki, metric in Prometheus, all visible in Grafana

## Open questions

- Ingress controller (nginx-ingress vs Traefik) — for now use NodePort + port-forward; ingress controller deferred to production cluster change

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| kind (Kubernetes in Docker) | platform-architect | `.opencode/rules/technologies/kind.md` | pending |
| kubectl | platform-architect | `.opencode/rules/technologies/k8s/kubectl.md` | pending |
| Helm | platform-architect | `.opencode/rules/technologies/helm.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| dev-environment workflow | devops-automation skill | `.opencode/skills/devops-automation/SKILL.md` | update | Add dev cluster setup/teardown workflow and kind image loading pattern |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated catalog entities; dev environment is infra, not a platform component |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
