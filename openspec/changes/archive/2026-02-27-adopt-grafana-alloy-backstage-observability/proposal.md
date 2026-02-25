---
td-board: adopt-grafana-alloy-backstage-observability
td-issue: td-824880
---

# Proposal: Adopt Grafana Alloy for Backstage Observability Collection

## Why

The current observability stack uses an OpenTelemetry Collector DaemonSet to collect logs, metrics, and traces. Grafana Alloy is the next-generation, OpenTelemetry-native collector from Grafana Labs that replaces both Promtail (log shipping) and the standalone OTel Collector with a single, programmable pipeline agent. Adopting Alloy unifies telemetry collection for Backstage under one agent, enabling richer log/metric/trace correlation and simplifying operational overhead.

## What Changes

- Replace the standalone OpenTelemetry Collector DaemonSet with Grafana Alloy in the `monitoring` namespace
- Replace Promtail DaemonSet with Alloy's built-in log collection (Kubernetes pod log scraping via `loki.source.kubernetes`)
- Configure Alloy to receive OTLP signals (logs, traces, metrics) from Backstage's Node.js OTel SDK and forward them to Loki, Tempo, and Prometheus
- Add Alloy Helm chart (`grafana/alloy`) to the observability stack deployment
- Author an Alloy usage rule documenting pipeline configuration patterns
- Update the Tech Radar to add Grafana Alloy at `Trial`

## Capabilities

### New Capabilities

- `alloy-deployment`: Deploy Grafana Alloy as a DaemonSet in the `monitoring` namespace, configured with an Alloy pipeline (`config.alloy`) that collects Kubernetes pod logs and receives OTLP from Backstage, routing signals to Loki, Tempo, and Prometheus
- `alloy-backstage-collection`: Configure Backstage's OTLP exporters (logs, metrics, traces) to target the Alloy agent endpoint, validating end-to-end signal delivery to each backend

### Modified Capabilities

- `observability-stack-deployment`: Replace OTel Collector + Promtail with Alloy in the Helm-based stack deployment; update values files and deployment scripts

## Impact

- Affected services/modules: `src/ops/observability/` (Helm values), Backstage backend OTel instrumentation (`packages/backend/src/instrumentation.js`)
- API changes: No
- Data model changes: No
- Dependencies: `grafana/alloy` Helm chart (new); removes `opentelemetry-collector` and `loki-stack`/`promtail` Helm charts
