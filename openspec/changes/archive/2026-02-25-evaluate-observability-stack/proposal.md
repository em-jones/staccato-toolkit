---
td-board: evaluate-observability-stack
td-issue: td-9a1d01
---

# Proposal: Evaluate and Select Observability Stack

## Why

The platform has no unified observability layer — there is no standardized approach for collecting metrics, aggregating logs, or tracing distributed requests across workloads. Without an agreed-upon stack, each service risks adopting incompatible tooling and creating operational blind spots.

## What Changes

- Evaluate and select a metrics collection and visualization solution (Prometheus + Grafana)
- Evaluate and select a log aggregation solution (Loki)
- Evaluate and select a distributed tracing solution (Tempo / Jaeger)
- Evaluate and adopt OpenTelemetry as the instrumentation SDK standard
- Document the selected stack as a usage rule for agent consumption
- Integrate the stack into the platform's Dagger CI pipeline and Kubernetes deployment configuration

## Capabilities

### New Capabilities

- `observability-metrics`: Prometheus metrics collection with Grafana dashboarding
- `observability-logging`: Loki log aggregation integrated with Grafana
- `observability-tracing`: Distributed tracing via Tempo with OpenTelemetry SDK

### Modified Capabilities

_(none — this is a net-new observability layer)_

## Impact

- Affected services/modules: `staccato-cli`, `staccato-server`, `src/ops/workloads` (Dagger pipeline), Kubernetes manifests
- API changes: No — observability is additive instrumentation
- Data model changes: No
- Dependencies: `prometheus`, `grafana`, `loki`, `tempo`, `opentelemetry-go` SDK; Kubernetes operator for stack deployment
