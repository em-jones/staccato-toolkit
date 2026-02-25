---
td-board: backstage-opentelemetry-setup
td-issue: td-42d906
---

# Proposal: Backstage OpenTelemetry Setup

## Why

Backstage already instruments its components with OpenTelemetry API calls (traces and metrics), but the backend package has no SDK configured to collect, process, and export that telemetry. Without an exporter wired in, all instrumentation is silently dropped — leaving the platform blind to Backstage's internal performance signals.

## What Changes

- Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-prometheus`, and `@opentelemetry/exporter-trace-otlp-http` dependencies to `packages/backend`
- Create `packages/backend/src/instrumentation.js` that initialises the NodeSDK with a Prometheus metric exporter and an OTLP/HTTP trace exporter
- Configure histogram bucket Views for catalog metrics that emit in seconds (vs. the SDK's default millisecond buckets)
- Wire the `--require ./src/instrumentation.js` flag into the `start` script in `packages/backend/package.json` for local development
- Update `Dockerfile` to copy `instrumentation.js` into the working directory and add `--require ./instrumentation.js` to the `CMD`
- Update `.dockerignore` to allowlist `packages/backend/src/instrumentation.js`

## Capabilities

### New Capabilities

- `otel-sdk-initialisation`: Install dependencies and create the `instrumentation.js` bootstrap file that starts the NodeSDK before any other module is loaded; configures Prometheus and OTLP/HTTP exporters and histogram Views
- `backstage-backend-otel-wiring`: Wire the `--require` flag for local dev (`package.json` start script) and production (Dockerfile `CMD`) so the SDK is always loaded first

### Modified Capabilities

_(none)_

## Impact

- Affected services/modules: `packages/backend` (Backstage backend package)
- API changes: No
- Data model changes: No
- Dependencies: `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-prometheus`, `@opentelemetry/exporter-trace-otlp-http` (all new, scoped to `packages/backend`)
- Metrics now exported on `localhost:9464/metrics` (Prometheus scrape endpoint)
- Traces forwarded to OTLP/HTTP endpoint (default: `http://localhost:4318/v1/traces`, Jaeger-compatible)
