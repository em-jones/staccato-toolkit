---
created-by-change: technology-audit
last-validated: 2026-02-25
---

# Grafana Usage Rules

Grafana is an open-source observability and data visualization platform. It is the standard dashboard and alerting tool for monitoring services, infrastructure, and business metrics. All observability dashboards MUST be created in Grafana and version-controlled as JSON.

## Core Principle

Grafana is the single dashboard platform for all observability data (metrics, logs, traces). All dashboards MUST be stored as JSON in version control and deployed via GitOps. Grafana connects to Prometheus (metrics), Loki (logs), and Tempo (traces) as data sources.

## Setup

Grafana is deployed via Helm in Kubernetes:

```yaml
# values.yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
  - name: Loki
    type: loki
    url: http://loki:3100
  - name: Tempo
    type: tempo
    url: http://tempo:3200
```

## Key Guidelines

### Store dashboards as JSON in version control

All dashboards MUST be exported as JSON and committed to the repository:

```bash
# Export dashboard from Grafana UI
# Dashboard Settings → JSON Model → Copy to clipboard

# Save to version control
mkdir -p dashboards/
cat > dashboards/service-overview.json <<EOF
{
  "dashboard": { ... },
  "folderId": 0,
  "overwrite": true
}
EOF
```

### Use templating for reusable dashboards

Create dashboard variables for services, namespaces, and environments:

```json
{
  "templating": {
    "list": [
      {
        "name": "namespace",
        "type": "query",
        "query": "label_values(up, namespace)"
      },
      {
        "name": "service",
        "type": "query",
        "query": "label_values(up{namespace=\"$namespace\"}, service)"
      }
    ]
  }
}
```

### Link metrics, logs, and traces

Use data links to correlate metrics → logs → traces:

```json
{
  "dataLinks": [
    {
      "title": "View Logs",
      "url": "/explore?datasource=Loki&queries=[{\"expr\":\"{namespace=\\\"$namespace\\\",service=\\\"$service\\\"}\"}]"
    },
    {
      "title": "View Traces",
      "url": "/explore?datasource=Tempo&queries=[{\"query\":\"$__trace_id\"}]"
    }
  ]
}
```

### Use consistent panel naming and layout

Follow dashboard organization conventions:

- **Row 1**: Overview metrics (request rate, error rate, latency)
- **Row 2**: Resource usage (CPU, memory, network)
- **Row 3**: Detailed metrics (per-endpoint, per-operation)
- **Row 4**: Logs and traces (correlated with metrics)

### Deploy dashboards via GitOps

Use Kubernetes ConfigMaps or Grafana provisioning to deploy dashboards:

```yaml
# ConfigMap for dashboard provisioning
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
data:
  service-overview.json: |
    { "dashboard": { ... } }
```

## Common Issues

**"Dashboard changes lost after Grafana restart"**
→ Export dashboards as JSON and store in version control. Use provisioning to deploy dashboards automatically.

**"Data source not found errors"**
→ Verify data source names match in dashboard JSON and Grafana configuration. Check data source URLs are reachable.

**"Variables not populating"**
→ Check variable queries against data source. Ensure label names match Prometheus metrics.

## See Also

- [Prometheus Usage Rules](./prometheus.md) - Metrics collection and querying
- [Loki Usage Rules](./loki.md) - Log aggregation and querying
- [Tempo Usage Rules](./tempo.md) - Distributed tracing backend
- [Observability Patterns](../patterns/delivery/observability.md) - Observability strategy
