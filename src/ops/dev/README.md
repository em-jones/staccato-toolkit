# Kubernetes Development Environment

Local Kubernetes cluster for end-to-end LGTM (Loki, Grafana, Tempo, Mimir/Prometheus) observability stack testing using [kind](https://kind.sigs.k8s.io/).

## Prerequisites

- Docker (for kind)
- [devbox](https://www.jetpack.io/devbox/) (provides `kind`, `kubectl`, `helm`)
- Minimum 8GB RAM (LGTM stack requires ~2GB)

## Quick Start

```bash
# Enter devbox shell (provides kind, kubectl, helm)
devbox shell

# Start the dev cluster and deploy the full LGTM stack
task dev-up

# Check that all pods are running
task dev-status

# Access Grafana (admin / changeme)
task dev-grafana
# → http://localhost:3000

# Access staccato-server
task dev-server
# → http://localhost:8080

# View LGTM stack specific commands
task dev-lgtm-port-forwards    # Show all port-forward commands
task dev-lgtm-logs             # View component logs
task dev-lgtm-queries          # Print example queries
```

## Architecture

The dev environment consists of:

- **kind cluster** (`staccato-dev`) — single control-plane node
- **monitoring namespace** — unified LGTM observability stack:
  - `lgtm-stack` — Loki (logs), Grafana (UI), Prometheus (metrics), Promtail (log shipper)
  - `tempo` — distributed tracing backend
  - `otel-collector` — OpenTelemetry Collector (DaemonSet for trace collection)
- **staccato namespace** — application services:
  - `staccato-server` — HTTP server with instrumentation
  - `staccato-cli` — CLI tool

## Deployment Order

The `task dev-up` command orchestrates the following sequence:

1. Create kind cluster with `kind-config.yaml`
2. Add Helm repositories (`grafana`)
3. Create namespaces (`monitoring`, `staccato`)
4. Deploy **LGTM stack** (unified Loki, Grafana, Prometheus, Promtail via `loki-stack` chart)
5. Deploy **Tempo** (distributed tracing backend)
6. Deploy **OTel Collector** (DaemonSet for trace collection)
7. Load local images (`staccato-server:dev`, `staccato-cli:dev`)
8. Apply application manifests
9. Wait for all deployments to be ready

## Accessing Components

### Grafana

```bash
task dev-grafana
# Opens port-forward to http://localhost:3000
# Credentials: admin / changeme
```

Pre-configured data sources (auto-integrated from LGTM stack):
- **Loki** — logs from all pods (via Promtail, primary datasource)
- **Prometheus** — metrics from staccato-server and OTel Collector
- **Tempo** — traces from staccato-server (via OTel Collector)

All data sources are automatically provisioned and configured for cross-signal correlation:
- Click on a trace to see related logs
- Click on metrics to navigate to related traces
- View service graphs and dependencies

### Prometheus

```bash
kubectl port-forward svc/lgtm-prometheus-server 9090:80 -n monitoring
# → http://localhost:9090
```

Check scrape targets: **Status → Targets**

Expected targets:
- `staccato-services` — scrapes staccato-server `/metrics` endpoint (via service discovery)
- Kubernetes internal metrics (kubelet, API server, etc.)

### Loki

Loki does not have a UI — query logs via Grafana:

1. Open Grafana → Explore
2. Select **Loki** data source
3. Query: `{namespace="staccato"}`

Expected labels:
- `service` — service name (extracted from JSON logs)
- `level` — log level (debug, info, warn, error)
- `environment` — environment (dev, staging, production)

### Tempo

Tempo does not have a UI — query traces via Grafana:

1. Open Grafana → Explore
2. Select **Tempo** data source
3. Search by service name or TraceQL query

Example TraceQL query:
```
{service.name="staccato-server"}
```

### Staccato Server

```bash
task dev-server
# Opens port-forward to http://localhost:8080

# Health check
curl http://localhost:8080/healthz

# Trigger a traced request
curl http://localhost:8080/api/example
```

## Observability Pipeline

```
staccato-server
  ├─ logs (JSON) → stdout → Promtail → Loki
  ├─ metrics (/metrics) → Prometheus (scrape)
  └─ traces (OTLP/gRPC) → OTel Collector → Tempo
```

The OTel Collector receives OTLP telemetry on:
- gRPC: `otel-collector.monitoring.svc.cluster.local:4317`
- HTTP: `otel-collector.monitoring.svc.cluster.local:4318`

And routes to:
- **Traces** → Tempo (OTLP/gRPC on `tempo:4317`)
- **Metrics** → Prometheus (remote_write on `lgtm-prometheus-server:9090`)
- **Logs** → Loki (HTTP push on `lgtm-loki:3100`)

## LGTM Stack Development Tasks

The following `task` commands help manage the LGTM stack during development:

### Status & Monitoring

```bash
task dev-lgtm-status          # Show LGTM component pod status
task dev-lgtm-logs            # View Loki, Grafana, Tempo, Prometheus logs
task dev-lgtm-describe        # Detailed status of all deployments
```

### Queries & Examples

```bash
task dev-lgtm-queries         # Print example LogQL, PromQL, TraceQL queries
task dev-lgtm-port-forwards   # Show all component port-forward commands
```

### Configuration Management

```bash
task dev-lgtm-upgrade         # Upgrade LGTM stack after editing values
task dev-lgtm-reset           # Remove and redeploy LGTM stack (for debugging)
```

## LGTM Stack Configuration

The LGTM stack is configured via these files:

- **`src/ops/observability/lgtm-stack-values.yaml`** — Main configuration for Loki, Grafana, Prometheus, Promtail
- **`src/ops/observability/lgtm-stack-values.tempo.yaml`** — Tempo distributed tracing configuration
- **`src/ops/dev/otel-collector.yaml`** — OpenTelemetry Collector configuration for trace collection

To modify the LGTM stack for development:
1. Edit the values files as needed
2. Run `task dev-lgtm-upgrade` to apply changes
3. Verify with `task dev-lgtm-status` and `task dev-lgtm-logs`

For detailed configuration options, see:
- [LGTM Stack README](../observability/README.md)
- [Observability patterns](../../../.opencode/rules/patterns/delivery/observability.md)
- [IaC patterns](../../../.opencode/rules/patterns/delivery/iac.md)

---

## GitOps Bootstrap (Harbor + Flux OCI)

The staccato platform uses a **GitOps bootstrap** sequence to activate Flux reconciliation from
a local Harbor OCI registry. This replaces the previous Gitea-based GitRepository source.

### Bootstrap Sequence

```
Phase 1:  k0sctl apply                          (provision k0s cluster)
Phase 2:  kustomize build | kubectl apply       (install KubeVela core)
Phase 3a: vela addon enable ./addons/harbor     (deploy Harbor OCI registry)
Phase 3b: vela addon enable ./addons/flux-operator  (deploy flux-operator, depends on harbor)
Phase 3c: staccato bootstrap oci-seed           (push initial OCI artifact to Harbor)
Phase 3d: kubectl apply -f gitops-provider-app.yaml  (apply FluxInstance via OAM Application)
Phase 4:  Flux reconciles from Harbor OCI artifacts  (GitOps loop active)
```

### Prerequisites

Before running Phase 3, inject credentials into the cluster:

```bash
# Harbor admin password (required by addon template.yaml)
kubectl create secret generic harbor-admin-credentials \
  -n harbor \
  --from-literal=HARBOR_ADMIN_PASSWORD=<your-password> \
  --from-literal=values.yaml="harborAdminPassword: <your-password>"

# Harbor registry credentials for Flux (dockerconfigjson)
kubectl create secret docker-registry harbor-oci-credentials \
  -n flux-system \
  --docker-server=harbor-core.harbor.svc.cluster.local \
  --docker-username=admin \
  --docker-password=<your-password>
```

### Bootstrap Commands

```bash
# Full bootstrap (Phases 3a–3d)
staccato bootstrap init \
  --addons-dir src/staccato-toolkit/core/assets/addons \
  --app-manifest src/staccato-toolkit/core/assets/bootstrap/gitops-provider-app.yaml

# Push OCI artifact only (Phase 3c standalone)
staccato bootstrap oci-seed \
  --registry-url oci://harbor-core.harbor.svc.cluster.local/staccato/manifests \
  --tag bootstrap \
  --manifests-dir .
```

### Verification

```bash
# Verify Harbor is running
kubectl get pods -n harbor

# Verify flux-operator and Flux controllers are running
kubectl get pods -n flux-system

# Verify gitops-provider Application is reconciling
kubectl get application gitops-provider -n vela-system

# Verify Flux OCI source is Ready
flux get sources oci -n flux-system

# Force reconciliation
flux reconcile source oci staccato-manifests -n flux-system
```

### Rollback

```bash
# Disable addons (removes Harbor and flux-operator)
vela addon disable flux-operator
vela addon disable harbor
```

### Addon Assets

Custom KubeVela addons are embedded in `src/staccato-toolkit/core/assets/addons/`:

- **`addons/harbor/`** — Harbor OCI registry (v1.16.0), installs into `harbor` namespace
- **`addons/flux-operator/`** — ControlPlane Flux Operator (v0.10.0), installs into `flux-system`

The `flux-operator` addon declares `dependencies: [{name: harbor}]` to enforce install ordering.
