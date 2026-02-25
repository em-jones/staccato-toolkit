---
created-by-change: technology-audit
last-validated: 2026-02-25
---

# ServiceMonitor Pattern

ServiceMonitor is a Kubernetes custom resource that defines how Prometheus should scrape metrics from Kubernetes workloads.

## Purpose

Declaratively configure Prometheus metric collection from services running in Kubernetes, enabling automatic discovery and scraping without manual Prometheus configuration.

## When to use

- Deploying observability-instrumented services in Kubernetes
- Enabling Prometheus auto-discovery of application metrics
- Scaling metrics collection across multiple namespaces or clusters

## Usage Standards

- Create one ServiceMonitor per service that exposes metrics
- Set `spec.selector.matchLabels` to target the service via label matching
- Define `spec.endpoints` with the correct port name and metrics path
- Use 30-second scrape intervals by default (`spec.endpoints[].interval`)
- Namespace ServiceMonitor resources in the same namespace as their target services
- Add `prometheus: kube-prometheus` label to ServiceMonitor for Prometheus discovery

## Example

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app-metrics
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Related

- [Prometheus](../../technologies/prometheus.md) — Metrics collection backend
- [OpenTelemetry](../../technologies/opentelemetry.md) — Observability SDK
