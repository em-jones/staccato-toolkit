---
td-board: evaluate-observability-stack-observability-metrics
td-issue: td-dc3077
---

# Specification: Observability — Metrics

## Overview

Defines requirements for Prometheus-based metrics collection and Grafana dashboarding, with OpenTelemetry as the instrumentation SDK for all Go services.

## ADDED Requirements

### Requirement: Prometheus metrics collection

The platform SHALL deploy Prometheus to scrape metrics from all Go services. Each service MUST expose a `/metrics` endpoint in the Prometheus exposition format. Prometheus MUST be configured with scrape intervals of ≤ 15 seconds for production workloads.

#### Scenario: Service metrics are scraped

- **WHEN** a Go service is running and exposes `/metrics`
- **THEN** Prometheus scrapes the endpoint at the configured interval and stores time-series data

#### Scenario: Missing metrics endpoint detected

- **WHEN** a configured scrape target returns a non-200 response
- **THEN** Prometheus marks the target as `DOWN` and the alert rule fires within 1 minute

### Requirement: Grafana dashboard provisioning

The platform SHALL deploy Grafana connected to Prometheus as a data source. Default dashboards MUST be provisioned via GitOps (dashboard JSON in version control). Dashboards SHALL cover: service request rate, error rate, latency (p50/p95/p99), and resource utilization.

#### Scenario: Dashboard loaded from version control

- **WHEN** Grafana starts or the configuration is reloaded
- **THEN** dashboards defined in the repo are automatically provisioned without manual UI interaction

#### Scenario: Query returns data

- **WHEN** a user opens a provisioned dashboard
- **THEN** all panels display data from the last 1 hour without errors

### Requirement: OpenTelemetry metrics SDK integration

All Go services SHALL use the OpenTelemetry Go SDK (`go.opentelemetry.io/otel`) to emit application-level metrics. Services MUST export metrics via the OTLP exporter to the OpenTelemetry Collector, which forwards to Prometheus. Custom business metrics MUST follow the naming convention `<service>_<subsystem>_<unit>_total`.

#### Scenario: Custom metric recorded

- **WHEN** a Go service handles a request or completes a business operation
- **THEN** the corresponding counter or histogram is incremented and exported via OTLP

#### Scenario: Metric naming validated

- **WHEN** a new metric is registered in a Go service
- **THEN** the metric name MUST match the pattern `<service>_<subsystem>_<unit>_total` or linting fails
