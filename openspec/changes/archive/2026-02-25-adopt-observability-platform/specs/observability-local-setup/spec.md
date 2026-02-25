---
td-board: adopt-observability-platform-observability-local-setup
td-issue: td-d3b82f
---

# Specification: Observability Local Setup

## Overview

Defines requirements for setting up the observability stack in the local kind+KubeVela environment, so developers can verify and use it during local development.

## ADDED Requirements

### Requirement: Observability stack is accessible in the local dev environment

After applying the OAM Application manifest to the local kind+KubeVela cluster, the observability stack SHALL be accessible to developers for querying metrics, logs, and traces from their local workloads.

#### Scenario: Grafana is accessible locally

- **WHEN** a developer applies the observability OAM Application to their local cluster
- **THEN** Grafana SHALL be accessible at a local port (e.g., via `kubectl port-forward` or NodePort)
- **AND** the Grafana UI SHALL show pre-configured dashboards for Kubernetes cluster metrics

#### Scenario: Prometheus is scraping metrics

- **WHEN** the stack is running
- **THEN** `kubectl -n monitoring port-forward svc/prometheus-operated 9090` SHALL expose the Prometheus UI
- **AND** Prometheus SHALL be scraping node and pod metrics from the kind cluster

#### Scenario: Loki is receiving logs

- **WHEN** the stack is running
- **THEN** Loki SHALL be deployed and Grafana SHALL have a pre-configured Loki datasource
- **AND** pod logs from the cluster SHALL be queryable via the Grafana Explore view

### Requirement: Setup procedure is documented

The design document SHALL include a step-by-step procedure for a developer to set up the full local observability stack from scratch (create kind cluster → install KubeVela → apply observability OAM Application → verify).

#### Scenario: Procedure is complete and self-contained

- **WHEN** a new developer follows the documented procedure
- **THEN** they SHALL be able to access Grafana, Prometheus, and Loki without any additional undocumented steps

### Requirement: Tempo (distributed traces) is provisioned

The observability stack SHALL include Tempo as the distributed tracing backend, with Grafana pre-configured to use Tempo as a trace datasource.

#### Scenario: Tempo datasource is configured in Grafana

- **WHEN** a developer opens Grafana datasources
- **THEN** they SHALL find a Tempo datasource configured and ready to receive traces from OpenTelemetry-instrumented services
