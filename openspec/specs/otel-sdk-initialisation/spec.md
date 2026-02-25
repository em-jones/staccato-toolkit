---
td-board: backstage-opentelemetry-setup-otel-sdk-initialisation
td-issue: td-f87841
---

# Specification: OTel SDK Initialisation

## Overview

Defines the requirements for installing OpenTelemetry SDK packages in the Backstage backend and creating the `instrumentation.js` bootstrap file that initialises the NodeSDK — including Prometheus metric export, OTLP/HTTP trace export, auto-instrumentation, and histogram Views — before any other module is loaded.

## ADDED Requirements

### Requirement: Install OpenTelemetry SDK packages

The system SHALL add the required OpenTelemetry packages as direct dependencies of `packages/backend` so the SDK is available at runtime.

#### Scenario: Required packages present

- **WHEN** `packages/backend/package.json` is inspected
- **THEN** it MUST list `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-prometheus`, and `@opentelemetry/exporter-trace-otlp-http` as dependencies

### Requirement: Instrumentation bootstrap file

The system SHALL provide a CommonJS `instrumentation.js` file at `packages/backend/src/instrumentation.js` that is the sole entry point for SDK initialisation.

#### Scenario: Main-thread guard

- **WHEN** `instrumentation.js` is loaded by a worker thread
- **THEN** the SDK MUST NOT be initialised (guard via `require('node:worker_threads').isMainThread`)

#### Scenario: SDK started on main thread

- **WHEN** `instrumentation.js` is loaded by the main thread
- **THEN** a `NodeSDK` instance MUST be constructed and `sdk.start()` MUST be called before any other application code runs

### Requirement: Prometheus metric exporter configured

The system SHALL configure a `PrometheusExporter` as the `metricReader` of the `NodeSDK`.

#### Scenario: Prometheus exporter default endpoint

- **WHEN** the Backstage backend process starts
- **THEN** Prometheus metrics MUST be available at `http://localhost:9464/metrics` using the default `PrometheusExporter` configuration

### Requirement: OTLP/HTTP trace exporter configured

The system SHALL configure an `OTLPTraceExporter` (HTTP transport) as the `traceExporter` of the `NodeSDK`.

#### Scenario: OTLP trace exporter endpoint

- **WHEN** the Backstage backend process starts
- **THEN** traces MUST be sent to `http://localhost:4318/v1/traces` by default (Jaeger-compatible OTLP/HTTP endpoint)

### Requirement: Auto-instrumentation enabled

The system SHALL enable `getNodeAutoInstrumentations()` so that Express, HTTP, and other Node.js library spans are captured automatically.

#### Scenario: Express spans generated

- **WHEN** an HTTP request is processed by the Backstage backend
- **THEN** an Express span MUST be created automatically without any manual instrumentation code

### Requirement: Histogram Views for catalog metrics

The system SHALL configure OpenTelemetry Views to override the default millisecond histogram buckets for catalog metrics that emit in seconds, using the explicit bucket sequence `[0, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 1000]`.

#### Scenario: Catalog processing duration buckets

- **WHEN** `catalog.processing.duration` is emitted
- **THEN** the histogram MUST use the second-resolution bucket sequence defined by the View rather than the SDK's default millisecond buckets
