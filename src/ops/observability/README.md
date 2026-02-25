# Observability Stack - Docker OTEL LGTM

This directory contains the unified observability stack based on **docker-otel-lgtm** for the staccato platform.

## Overview

The staccato platform uses an integrated **LGTM stack** (Logs, Grafana, Traces, Metrics) plus **Profiles** for complete observability:

- **Logs** (Loki) - Log aggregation with service labels
- **Grafana** - Visualization, dashboarding, alerting
- **Traces** (Tempo) - Distributed tracing for request flows
- **Metrics** (Prometheus) - Time-series metrics collection
- **Profiles** (Pyroscope) - Continuous profiling for performance analysis

All components are bundled in the `grafana/otel-lgtm` Docker image with Grafana as a unified interface.

## Quick Start

### Prerequisites
- Kubernetes 1.21+ (via kind, minikube, Docker Desktop, or cloud provider)
- kubectl configured to your cluster
- Garden CLI (for development)

### Deploy the Stack (Kubernetes)

```bash
# Create namespace
kubectl create namespace monitoring

# Apply the deployment
kubectl apply -f <(cat <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: lgtm
  namespace: monitoring
spec:
  selector:
    app: lgtm
  ports:
    - name: grafana
      port: 3000
      targetPort: 3000
    - name: prometheus
      port: 9090
      targetPort: 9090
    - name: otel-grpc
      port: 4317
      targetPort: 4317
    - name: otel-http
      port: 4318
      targetPort: 4318
    - name: pyroscope
      port: 4040
      targetPort: 4040
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lgtm
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lgtm
  template:
    metadata:
      labels:
        app: lgtm
    spec:
      containers:
        - name: lgtm
          image: grafana/otel-lgtm:latest
          ports:
            - containerPort: 3000
            - containerPort: 9090
            - containerPort: 4317
            - containerPort: 4318
            - containerPort: 4040
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 2Gi
          volumeMounts:
            - name: tempo-data
              mountPath: /data/tempo
            - name: grafana-data
              mountPath: /data/grafana
            - name: loki-data
              mountPath: /data/loki
            - name: prometheus-data
              mountPath: /data/prometheus
            - name: pyroscope-data
              mountPath: /data/pyroscope
      volumes:
        - name: tempo-data
          emptyDir: {}
        - name: grafana-data
          emptyDir: {}
        - name: loki-data
          emptyDir: {}
        - name: prometheus-data
          emptyDir: {}
        - name: pyroscope-data
          emptyDir: {}
EOF
)

# Port-forward to access services
kubectl port-forward -n monitoring svc/lgtm 3000:3000
```

### Deploy via Garden (Development)

```bash
# Enter devbox shell
devbox shell

# Deploy with full cluster setup
task dev-up

# Or deploy just LGTM
garden deploy lgtm
```

### Access Grafana UI

```bash
# Using kubectl port-forward
kubectl port-forward -n monitoring svc/lgtm 3000:3000

# Open http://localhost:3000
# Default credentials: admin / admin
```

## Stack Components

### Loki (Log Aggregation)
- **Purpose**: Centralized log storage and querying via labels
- **Port**: 3100 (internal)
- **Access**: Via Grafana (Loki data source)
- **Query Language**: LogQL
- **Default Retention**: 72 hours (development)

Example LogQL queries:
```logql
{service="api-gateway", level="error"}
{namespace="staccato", trace_id!=""}
rate({job="staccato-server"} | json [5m])
```

### Grafana (Visualization)
- **Purpose**: Unified observability UI for logs, metrics, traces, profiles
- **Port**: 3000
- **Default URL**: http://localhost:3000
- **Default Credentials**: admin / admin
- **Features**:
  - Dashboards for metrics and logs
  - Explore interface for ad-hoc queries
  - Alerts and notifications
  - User management and RBAC

### Tempo (Distributed Tracing)
- **Purpose**: Store and query distributed traces
- **Port**: 3100 (API), 4317/4318 (OTLP ingestion)
- **Access**: Via Grafana (Tempo data source)
- **Query Language**: TraceQL
- **Default Retention**: 72 hours (development)

Services send traces via OTLP:
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

Example TraceQL queries:
```traceql
{ .service.name = "staccato-server" }
{ .http.status_code = 500 }
{ duration > 100ms }
```

### Prometheus (Metrics)
- **Purpose**: Time-series metrics storage and querying
- **Port**: 9090
- **Default URL**: http://localhost:9090
- **Default Retention**: 15 days (development)
- **Scrape Interval**: 15 seconds

Example PromQL queries:
```promql
rate(http_requests_total[5m])
histogram_quantile(0.95, http_request_duration_seconds_bucket)
rate(errors_total[1m])
```

### Pyroscope (Continuous Profiling)
- **Purpose**: Collect and visualize continuous profiles from applications
- **Port**: 4040
- **Default URL**: http://localhost:4040
- **Supported Formats**: pprof, jfr
- **Default Retention**: 72 hours (development)

Applications send profiles via:
```bash
export PYROSCOPE_APPLICATION_NAME=staccato-server
export PYROSCOPE_SERVER_ADDRESS=http://lgtm:4040
```

### OpenTelemetry Collector (Built-in)
- **Purpose**: Receive and forward all OpenTelemetry signals (metrics, traces, logs)
- **OTLP Ports**: 4317 (gRPC), 4318 (HTTP)
- **Configuration**: Pre-configured in docker-otel-lgtm image
- **Routes**:
  - Metrics → Prometheus
  - Traces → Tempo
  - Logs → Loki
  - Profiles → Pyroscope

## Configuration

### Environment Variables

Configuration is managed via `docker-otel-lgtm.env`:

```bash
# Enable debug logging
ENABLE_LOGS_GRAFANA=false
ENABLE_LOGS_LOKI=false
ENABLE_LOGS_PROMETHEUS=false
ENABLE_LOGS_TEMPO=false
ENABLE_LOGS_PYROSCOPE=false
ENABLE_LOGS_OTELCOL=false

# Enable eBPF auto-instrumentation (requires Linux kernel 5.8+)
ENABLE_OBI=false
# OBI_TARGET=java  # or python, node, dotnet, ruby

# Forward telemetry to external backend
# OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway.grafana.net/otlp
# OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>
```

See `docker-otel-lgtm.env` for full documentation.

### Kubernetes Configuration

The deployment in `garden.yml` includes:

**Resource requests/limits**:
```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 2Gi
```

**Exposed ports**:
- 3000: Grafana UI
- 9090: Prometheus API
- 4317: OpenTelemetry Collector OTLP gRPC
- 4318: OpenTelemetry Collector OTLP HTTP
- 4040: Pyroscope profiling backend

**Data storage**:
- Development: `emptyDir` (ephemeral, data lost on pod restart)
- Production: Upgrade to PersistentVolumeClaims

## Development Workflow

### Typical Session

```bash
# 1. Enter devbox shell
devbox shell

# 2. Create cluster with LGTM
task dev-up

# 3. Check status
task dev-status

# 4. Access Grafana
open http://localhost:3000
# Default: admin / admin

# 5. Configure your application to send telemetry
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# 6. View telemetry in Grafana
# - Logs: Grafana > Explore > Loki
# - Traces: Grafana > Explore > Tempo
# - Metrics: Grafana > Explore > Prometheus
# - Profiles: Grafana > Explore > Pyroscope

# 7. When done
task dev-down
```

### Sending Telemetry

#### From within the cluster:
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm.monitoring.svc.cluster.local:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

#### From outside the cluster (local dev):
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

#### Go example:
```go
import (
    "go.opentelemetry.io/exporters/otlp/otlptrace/otlptracehttp"
)

exporter, _ := otlptracehttp.New(ctx,
    otlptracehttp.WithEndpoint("lgtm.monitoring.svc.cluster.local:4318"),
)
```

#### Python example:
```python
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

exporter = OTLPSpanExporter(
    otlp_endpoint="http://lgtm.monitoring.svc.cluster.local:4318/v1/traces"
)
```

## Observability Integration (Alloy)

For more advanced observability, the stack includes **Grafana Alloy** as the telemetry collector via Helm chart:

```bash
# Deploy Alloy (included in task dev-up, or deploy separately)
garden deploy alloy

# Alloy is also part of the full dev-up workflow
task dev-up
```

Alloy provides:
- Kubernetes pod log collection via label matching
- Node and pod metrics collection via service discovery
- OpenTelemetry protocol (OTLP) reception and forwarding
- Flow-based telemetry pipeline (River language)
- Automatic Prometheus metrics scraping

See `alloy/values.yaml` for Helm chart configuration and `alloy/config.alloy` for pipeline details.

## Grafana Dashboards

Custom dashboards are deployed via ConfigMaps:

```bash
# Staccato-specific dashboards
kubectl apply -f manifests/grafana-dashboards-staccato.yaml

# Grafana will auto-discover them in the "General" folder
```

To create a dashboard:
1. Open Grafana (http://localhost:3000)
2. Create dashboard with Loki, Prometheus, or Tempo panels
3. Save as JSON
4. Add to `manifests/grafana-dashboards-staccato.yaml`

## Troubleshooting

### LGTM Pod Not Starting

```bash
# Check pod status
kubectl describe pod -l app=lgtm -n monitoring

# Check logs
kubectl logs -l app=lgtm -n monitoring

# Check resource availability
kubectl top nodes
kubectl top pod -n monitoring
```

### Can't Access Grafana

```bash
# Check service
kubectl get svc -n monitoring

# Verify port-forward is active
kubectl port-forward -n monitoring svc/lgtm 3000:3000

# Check pod readiness
kubectl get pod -l app=lgtm -n monitoring
```

### Telemetry Not Appearing

```bash
# Verify OTLP endpoint configuration
echo $OTEL_EXPORTER_OTLP_ENDPOINT

# Check LGTM logs for OTLP errors
kubectl logs -l app=lgtm -n monitoring | grep -i otlp

# Verify Alloy is forwarding (if using Alloy)
kubectl logs -l app=alloy -n monitoring
```

### Data Persistence Issues

By default, LGTM uses ephemeral storage (`emptyDir`):
- Data is **lost** when pod restarts
- Good for development and testing
- For production, upgrade to PersistentVolumeClaims

```yaml
# In garden.yml, replace:
volumes:
  - name: grafana-data
    emptyDir: {}
# With:
volumes:
  - name: grafana-data
    persistentVolumeClaim:
      claimName: grafana-pvc
```

## Migration from Separate Helm Charts (Old Setup)

The old setup used separate Helm charts:
- `grafana/loki-stack` for Loki + Grafana + Prometheus
- `grafana/tempo` for Tempo (separate)
- `grafana/mimir-distributed` for Mimir (optional, long-term metrics)

**Old files are deprecated**:
- `lgtm-stack-values.yaml.deprecated`
- `lgtm-stack-values.tempo.yaml.deprecated`
- `lgtm-stack-values.mimir.yaml.deprecated`

**Benefits of migration**:
- Single container instead of 5+ components
- Faster startup and simpler configuration
- Built-in OTLP collector (no separate sidecar needed)
- Includes Pyroscope for profiling
- Better alignment with modern observability practices

## Related Documentation

- [Docker OTEL LGTM](https://github.com/grafana/docker-otel-lgtm)
- [Garden Documentation](https://docs.garden.io)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [GARDEN-INTEGRATION.md](./GARDEN-INTEGRATION.md) - Detailed Garden integration guide

## Support

For issues or questions:
- Check [Docker OTEL LGTM GitHub Issues](https://github.com/grafana/docker-otel-lgtm/issues)
- Review logs: `kubectl logs -l app=lgtm -n monitoring`
- Check Grafana Status page: http://localhost:3000/status
