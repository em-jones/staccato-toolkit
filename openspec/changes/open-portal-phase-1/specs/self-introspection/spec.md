---
td-board: open-portal-phase-1-self-introspection
td-issue: td-cc8409
---

# Specification: Self-Introspection

## Overview

Defines turn-key observability for OpenPort itself: OTel SDK instrumentation (metrics, traces,
logs) and a bundled self-monitoring dashboard package. Self-introspection is active by default in
new installs and can be disabled via a feature flag.

## ADDED Requirements

### Requirement: OTel SDK instrumentation

The TanStack Start application SHALL initialise the `@opentelemetry/sdk-node` SDK on startup.
Instrumentation SHALL cover: HTTP request duration histogram (per route), request count (by
method/status), and trace spans for all server function invocations. The SDK SHALL export signals
to an OTLP endpoint configured via `OTEL_EXPORTER_OTLP_ENDPOINT` (defaulting to
`http://localhost:4318`).

#### Scenario: HTTP request metric recorded

- **WHEN** a server function is called and returns
- **THEN** an `http.server.request.duration` histogram data point is recorded with attributes
  `http.method`, `http.route`, and `http.response.status_code`

#### Scenario: OTLP endpoint override respected

- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318` is set
- **THEN** the SDK exports to `http://collector:4318` instead of the default

### Requirement: Structured logging via OTel Logs

Application logs SHALL be emitted as OTel Log Records using `@opentelemetry/sdk-logs`. Log
entries SHALL include `severity`, `body`, and a `trace_id` attribute when emitted within an
active trace context.

#### Scenario: Error log includes trace ID

- **WHEN** an error is logged inside a traced server function
- **THEN** the log record's `trace_id` attribute matches the active span's trace ID

### Requirement: Pre-built self-monitoring dashboard

A dashboard definition file SHALL be provided at
`packages/plugins/signals/self-introspection/dashboard.json` containing panels for: HTTP request
rate, p50/p95 request latency, error rate, and active sessions. This file SHALL be loaded and
registered in the dashboard registry on startup unless `OPENPORT_SELF_INTROSPECTION=false`.

#### Scenario: Dashboard appears in dashboard list by default

- **WHEN** a user navigates to the Dashboards section in a fresh install
- **THEN** an "OpenPort: Self-Introspection" dashboard appears in the list

#### Scenario: Dashboard suppressed when feature disabled

- **WHEN** `OPENPORT_SELF_INTROSPECTION=false` is set
- **THEN** the self-introspection dashboard does not appear in the list

### Requirement: Self-catalog entity pre-registered

A `catalog-info.yaml` describing the OpenPort application itself SHALL be bundled at
`src/open-portal/catalog-info.yaml`. On application start, this entity SHALL be automatically
upserted into the catalog so that K8s resources labelled `staccato.io/catalog-entity: open-portal`
are correlated without manual setup.

#### Scenario: OpenPort entity present after first start

- **WHEN** the application starts for the first time with an empty database
- **THEN** a `Component` entity named `open-portal` exists in the catalog

#### Scenario: Upsert idempotent on restart

- **WHEN** the application restarts with the entity already in the database
- **THEN** no duplicate entity is created and no error is logged
