---
created-by-change: adopt-grafana-alloy-backstage-observability
last-validated: 2026-02-27
---

# Grafana Alloy Usage Rules

Grafana Alloy is the next-generation OpenTelemetry-native collector from Grafana Labs. It unifies telemetry collection (logs, traces, metrics) into a single agent with a programmable pipeline DSL (River). Alloy replaces both the OpenTelemetry Collector and Promtail in the observability stack.

## Core Principle

Grafana Alloy is the single collection agent for all observability signals. All Kubernetes observability collection MUST use Alloy as a DaemonSet. Alloy pipelines MUST be written in River syntax and stored in `config.alloy` files. All three signal types (logs, traces, metrics) MUST flow through Alloy to their respective backends (Loki, Tempo, Prometheus).

## Architecture

Alloy runs as a DaemonSet in the `monitoring` namespace and provides:

- **Log collection**: `loki.source.kubernetes` reads pod stdout/stderr and forwards to Loki
- **Trace ingestion**: `otelcol.receiver.otlp` accepts OTLP/gRPC and OTLP/HTTP from services
- **Metric ingestion**: `otelcol.receiver.otlp` accepts OTLP metrics
- **Signal routing**: Traces → Tempo, metrics → Prometheus, logs → Loki via dedicated exporters

```
Services (OTLP/HTTP :4318)
         ↓
Alloy DaemonSet (monitoring ns)
  ├─ otelcol.receiver.otlp
  │    ├─ traces  → otelcol.exporter.otlp → Tempo :4317
  │    ├─ metrics → prometheus.remote_write → Prometheus :9090
  │    └─ logs    → otelcol.exporter.loki  → Loki :3100
  └─ loki.source.kubernetes
       └─ loki.write → Loki :3100
```

## Setup

### Deploy Alloy via Helm

```yaml
# values.yaml for grafana/alloy Helm chart
alloy:
  config: |
    # River configuration embedded in Helm values
    otelcol.receiver.otlp "default" {
      grpc {
        endpoint = "0.0.0.0:4317"
      }
      http {
        endpoint = "0.0.0.0:4318"
      }
      output {
        traces  = [otelcol.exporter.otlp.tempo.input]
        metrics = [prometheus.remote_write.prometheus.receiver]
        logs    = [otelcol.exporter.loki.default.input]
      }
    }

    loki.source.kubernetes "pod_logs" {
      targets    = discovery.kubernetes.pods.targets
      forward_to = [loki.write.default.receiver]
    }

    otelcol.exporter.otlp "tempo" {
      client {
        endpoint = "tempo.monitoring.svc.cluster.local:4317"
      }
    }

    prometheus.remote_write "prometheus" {
      endpoint {
        url = "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/write"
      }
    }

    otelcol.exporter.loki "default" {
      forward_to = [loki.write.default.receiver]
    }

    loki.write "default" {
      loki {
        url = "http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push"
      }
    }
```

### Configure services to export to Alloy

Services MUST export OTLP signals to `alloy.monitoring.svc.cluster.local:4318` (OTLP/HTTP):

```bash
# Environment variables for Node.js / OpenTelemetry SDK
export OTEL_EXPORTER_OTLP_ENDPOINT=http://alloy.monitoring.svc.cluster.local:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf  # or grpc
export OTEL_SERVICE_NAME=my-service
```

## Key Guidelines

### River Syntax: Components and Attributes

River is a declarative configuration language for Alloy pipelines. Every component has:

- **Name**: `otelcol.receiver.otlp`, `loki.source.kubernetes`, etc.
- **Label**: User-defined identifier (e.g., `"default"`)
- **Arguments**: Configuration parameters
- **Blocks**: Nested configuration (e.g., `grpc { ... }`, `http { ... }`)
- **Exports**: Output values that can be referenced by other components

```river
// Component syntax
component.type "label" {
  argument1 = value1
  argument2 = value2

  nested_block {
    nested_arg = value
  }

  // Exports are accessed as component.type.label.export_name
}
```

### Log collection: `loki.source.kubernetes`

The `loki.source.kubernetes` component discovers pods and reads their logs:

```river
// ✓ Good: Collect all pod logs with pod metadata
loki.source.kubernetes "pod_logs" {
  // Discover all pods in the cluster
  targets    = discovery.kubernetes.pods.targets
  forward_to = [loki.write.default.receiver]
}

// ✓ Good: Filter by namespace
loki.source.kubernetes "backstage_logs" {
  targets = discovery.kubernetes.pods.targets
  
  // Only collect logs from backstage namespace
  relabel_rules {
    action        = "drop"
    regex         = "(?!backstage)"
    source_labels = ["__meta_kubernetes_namespace"]
  }
  
  forward_to = [loki.write.default.receiver]
}

// ✗ Avoid: Hardcoding pod names
// Use discovery instead to automatically handle pod lifecycle
```

**Log labels** added automatically by `loki.source.kubernetes`:

- `namespace`: Kubernetes namespace
- `pod`: Pod name
- `container`: Container name
- `app`: App label from pod metadata
- `__meta_kubernetes_pod_label_*`: All pod labels

### OTLP Receiver: `otelcol.receiver.otlp`

The `otelcol.receiver.otlp` component accepts traces, metrics, and logs via OTLP/gRPC or OTLP/HTTP:

```river
// ✓ Good: Accept both gRPC and HTTP
otelcol.receiver.otlp "default" {
  grpc {
    endpoint = "0.0.0.0:4317"
  }
  http {
    endpoint = "0.0.0.0:4318"
  }
  output {
    traces  = [otelcol.exporter.otlp.tempo.input]
    metrics = [prometheus.remote_write.prometheus.receiver]
    logs    = [otelcol.exporter.loki.default.input]
  }
}

// ✓ Good: Use gRPC for Go services (lower overhead)
// ✓ Good: Use HTTP for Node.js / web services (better compatibility)

// ✗ Avoid: Hardcoding service addresses in receiver config
// Services should discover Alloy via DNS (alloy.monitoring.svc.cluster.local)
```

### Trace export: `otelcol.exporter.otlp`

Export traces to Tempo via OTLP/gRPC:

```river
// ✓ Good: Export traces to Tempo
otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "tempo.monitoring.svc.cluster.local:4317"
  }
}

// ✓ Good: Add batch processor for efficiency
otelcol.processor.batch "default" {
  send_batch_size = 1024
  timeout         = "10s"
}

// ✗ Avoid: Exporting to multiple backends without routing
// Use separate exporters and route by signal type
```

### Metric export: `prometheus.remote_write`

Export metrics to Prometheus via remote write:

```river
// ✓ Good: Remote write to Prometheus
prometheus.remote_write "prometheus" {
  endpoint {
    url = "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/write"
  }
}

// ✓ Good: Add relabeling for consistency
prometheus.remote_write "prometheus" {
  endpoint {
    url = "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/write"
  }
  
  external_labels {
    cluster = "dev"
    env     = "development"
  }
}

// ✗ Avoid: Scraping Prometheus directly from Alloy
// Use otelcol.receiver.otlp for OTLP metrics, not Prometheus scraping
```

### Log export: `otelcol.exporter.loki`

Export logs (from OTLP) to Loki:

```river
// ✓ Good: Export OTLP logs to Loki
otelcol.exporter.loki "default" {
  forward_to = [loki.write.default.receiver]
}

// ✓ Good: Add resource detection for service context
otelcol.processor.resource_detection "default" {
  detectors = ["gcp", "aws", "kubernetes"]
}

// ✗ Avoid: Duplicate log export paths
// Route OTLP logs through a single exporter to avoid duplication
```

### Loki write: `loki.write`

Write logs to Loki:

```river
// ✓ Good: Write to Loki with default settings
loki.write "default" {
  loki {
    url = "http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push"
  }
}

// ✓ Good: Add batching for efficiency
loki.write "default" {
  loki {
    url = "http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push"
  }
  
  wal {
    enabled = true
    dir     = "/tmp/alloy/wal"
  }
}

// ✗ Avoid: Multiple Loki write destinations for the same logs
// Use a single loki.write and route multiple sources to it
```

## Configuration Patterns

### Complete pipeline: Logs, traces, and metrics

```river
// Discover Kubernetes pods
discovery.kubernetes "pods" {
  role = "pod"
}

// Collect pod logs
loki.source.kubernetes "pod_logs" {
  targets    = discovery.kubernetes.pods.targets
  forward_to = [loki.write.default.receiver]
}

// Receive OTLP signals from services
otelcol.receiver.otlp "default" {
  grpc {
    endpoint = "0.0.0.0:4317"
  }
  http {
    endpoint = "0.0.0.0:4318"
  }
  output {
    traces  = [otelcol.exporter.otlp.tempo.input]
    metrics = [prometheus.remote_write.prometheus.receiver]
    logs    = [otelcol.exporter.loki.default.input]
  }
}

// Export traces to Tempo
otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "tempo.monitoring.svc.cluster.local:4317"
  }
}

// Export metrics to Prometheus
prometheus.remote_write "prometheus" {
  endpoint {
    url = "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/write"
  }
}

// Export logs to Loki
otelcol.exporter.loki "default" {
  forward_to = [loki.write.default.receiver]
}

// Write logs to Loki backend
loki.write "default" {
  loki {
    url = "http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push"
  }
}
```

### Namespace-scoped log collection

```river
// Collect logs only from backstage namespace
loki.source.kubernetes "backstage_logs" {
  targets = discovery.kubernetes.pods.targets
  
  relabel_rules {
    action        = "drop"
    regex         = "(?!backstage)"
    source_labels = ["__meta_kubernetes_namespace"]
  }
  
  forward_to = [loki.write.default.receiver]
}
```

### Trace sampling and filtering

```river
// Sample 10% of traces
otelcol.processor.probabilistic_sampler "default" {
  sampling_percentage = 10
}

// Filter out health check spans
otelcol.processor.filter "drop_health_checks" {
  traces {
    span {
      attributes {
        action = "delete"
        key    = "http.route"
        value  = "/health"
      }
    }
  }
}

// Chain processors in the receiver output
otelcol.receiver.otlp "default" {
  grpc {
    endpoint = "0.0.0.0:4317"
  }
  http {
    endpoint = "0.0.0.0:4318"
  }
  output {
    traces = [
      otelcol.processor.probabilistic_sampler.default.input,
      otelcol.processor.filter.drop_health_checks.input,
    ]
    metrics = [prometheus.remote_write.prometheus.receiver]
    logs    = [otelcol.exporter.loki.default.input]
  }
}
```

## Troubleshooting

### Alloy DaemonSet not ready

```bash
# Check pod status
kubectl get daemonset alloy -n monitoring
kubectl logs -n monitoring -l app=alloy --tail=50

# Verify Helm values
helm get values alloy -n monitoring
```

### Logs not appearing in Loki

1. **Check pod discovery**: Verify `loki.source.kubernetes` is discovering pods
2. **Check Loki connectivity**: Ensure `loki.write` can reach Loki endpoint
3. **Check labels**: Verify logs have expected labels in Loki UI

```bash
# Port-forward to Alloy UI (if enabled)
kubectl port-forward -n monitoring svc/alloy 12345:12345
# Visit http://localhost:12345
```

### Traces not appearing in Tempo

1. **Check service configuration**: Verify `OTEL_EXPORTER_OTLP_ENDPOINT` points to Alloy
2. **Check receiver**: Verify `otelcol.receiver.otlp` is listening on correct port
3. **Check exporter**: Verify `otelcol.exporter.otlp` can reach Tempo

```bash
# Test OTLP endpoint from a pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -X POST http://alloy.monitoring.svc.cluster.local:4318/v1/traces \
  -H "Content-Type: application/protobuf" -d @trace.pb
```

### Metrics not appearing in Prometheus

1. **Check metric ingestion**: Verify services are sending metrics via OTLP
2. **Check exporter**: Verify `prometheus.remote_write` can reach Prometheus
3. **Check labels**: Verify metrics have `service_name` attribute

```bash
# Query Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090 and search for metrics
```

## Migration from OTel Collector + Promtail

If migrating from separate OpenTelemetry Collector and Promtail deployments:

1. **Deploy Alloy alongside existing agents** (parallel run)
2. **Update services to export to Alloy** (`OTEL_EXPORTER_OTLP_ENDPOINT`)
3. **Validate signal delivery** (logs, traces, metrics in backends)
4. **Remove OTel Collector and Promtail** Helm releases
5. **Update deployment documentation**

Log label schema changes:

- **Old (Promtail)**: `{namespace="...", pod="...", container="..."}`
- **New (Alloy)**: `{namespace="...", pod="...", container="...", app="..."}`

Loki queries using `{namespace="..."}` are unaffected; the `app` label provides richer context.

## Deployment Checklist

- [ ] Alloy DaemonSet deployed in `monitoring` namespace
- [ ] `config.alloy` file committed to version control
- [ ] Services configured with `OTEL_EXPORTER_OTLP_ENDPOINT=alloy.monitoring.svc.cluster.local:4318`
- [ ] Pod logs appearing in Loki within 30 seconds
- [ ] Traces appearing in Tempo within 10 seconds
- [ ] Metrics appearing in Prometheus
- [ ] Alloy Helm chart version pinned in values
- [ ] RBAC permissions verified for `loki.source.kubernetes`

## See Also

- [OpenTelemetry Usage Rules](./opentelemetry.md) - OTLP instrumentation and SDK setup
- [Loki Usage Rules](./loki.md) - Log aggregation and querying
- [Tempo Usage Rules](./tempo.md) - Distributed tracing backend
- [Prometheus Usage Rules](./prometheus.md) - Metrics collection and querying
- [Grafana Usage Rules](./grafana.md) - Dashboard and visualization
- [Observability Patterns](../patterns/delivery/observability.md) - Observability strategy
- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/latest/)
