# Specification: Alloy Deployment

## Overview

Defines the requirements for deploying Grafana Alloy as a DaemonSet in the `monitoring` namespace, configured with a `config.alloy` pipeline that collects Kubernetes pod logs and receives OTLP signals from services, routing all telemetry to the appropriate Grafana LGTM backends.

## ADDED Requirements

### Requirement: Alloy Helm chart installation

The `grafana/alloy` Helm chart SHALL be installed in the `monitoring` namespace with release name `alloy`, using a values file at `src/ops/observability/alloy/values.yaml`.

#### Scenario: Alloy DaemonSet is running

- **WHEN** `helm upgrade --install alloy grafana/alloy -n monitoring -f src/ops/observability/alloy/values.yaml` is executed
- **THEN** `kubectl get daemonset alloy -n monitoring` MUST show the DaemonSet with the desired number of pods scheduled and ready

### Requirement: Alloy pipeline configuration (config.alloy)

Alloy SHALL be configured via a `config.alloy` file (stored as a ConfigMap) using River/Alloy syntax that defines at minimum: an OTLP receiver, a Loki write component, a Prometheus remote_write component, and a Tempo (OTLP) write component.

#### Scenario: Config is syntactically valid

- **WHEN** `alloy fmt config.alloy` is executed
- **THEN** the command MUST exit 0 with no errors

#### Scenario: All pipeline components are active

- **WHEN** Alloy is running and the UI is accessible via `kubectl port-forward`
- **THEN** the Alloy UI at `/graph` MUST show all defined pipeline components in a healthy (non-error) state

### Requirement: Kubernetes pod log collection

Alloy SHALL collect pod logs from the local Kubernetes node using `loki.source.kubernetes` and forward them to the Loki endpoint, preserving labels: `namespace`, `pod`, `container`, and `app`.

#### Scenario: Pod logs appear in Loki

- **WHEN** a pod in any namespace emits stdout/stderr logs
- **THEN** Grafana Explore → Loki data source → `{namespace="<ns>"}` MUST return those log lines within 30 seconds

#### Scenario: Required log labels are present

- **WHEN** a log line is queried in Loki
- **THEN** the log entry MUST include labels `namespace`, `pod`, `container`, and `app`

### Requirement: OTLP receiver configuration

Alloy SHALL expose an OTLP/gRPC receiver on port `4317` and an OTLP/HTTP receiver on port `4318` so that services can push telemetry to the local Alloy agent.

#### Scenario: OTLP gRPC endpoint is reachable

- **WHEN** a service sends an OTLP/gRPC span to `alloy.<node-ip>:4317`
- **THEN** the connection MUST be accepted and the span MUST be enqueued for export

#### Scenario: OTLP HTTP endpoint is reachable

- **WHEN** a service sends an OTLP/HTTP POST to `alloy.<node-ip>:4318`
- **THEN** the connection MUST be accepted and the payload MUST be enqueued for export

### Requirement: Signal routing to backends

Alloy SHALL route telemetry received via OTLP to the correct backends: traces → Tempo (OTLP), metrics → Prometheus (remote_write), logs → Loki (loki.write).

#### Scenario: Traces routed to Tempo

- **WHEN** a span is received by the Alloy OTLP receiver
- **THEN** the span MUST appear in Tempo within 10 seconds, queryable by service name

#### Scenario: Metrics routed to Prometheus

- **WHEN** a metric is received by the Alloy OTLP receiver
- **THEN** the metric MUST be visible in Prometheus within 30 seconds

#### Scenario: Logs routed to Loki

- **WHEN** a log record is received by the Alloy OTLP receiver
- **THEN** the log MUST appear in Loki within 30 seconds, queryable by its resource attributes
