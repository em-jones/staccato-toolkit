---
td-board: oam-application-pattern-service-deployment
td-issue: td-e14f78
---

# Specification: Service Deployment (delta)

## Overview

Updates the `service-deployment` spec to clarify that raw manifests under `src/ops/dev/manifests/` are the transitional source of truth during migration to the OAM Application pattern. Once the `oam-application-pattern` is adopted for a component, raw manifests for that component MUST be removed and the rendered outputs in `staccato-manifests` become the authoritative source.

## MODIFIED Requirements

### Requirement: staccato-server Kubernetes manifests

Kubernetes manifests SHALL exist at `src/ops/dev/manifests/staccato-server/` as the **transitional** source of truth. They SHALL include:
- `Deployment`: 1 replica, image `staccato-server:dev` (loaded into kind via `kind load docker-image`), `OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector.monitoring.svc.cluster.local:4317`, `LOG_LEVEL=debug`, liveness probe on `/healthz`, readiness probe on `/healthz`
- `Service`: ClusterIP on port 8080
- `ServiceMonitor`: pointing to port 8080 for Prometheus scraping

These raw manifests SHALL be removed from `src/ops/dev/manifests/staccato-server/` once the `staccato-server-oam-example` OAM Application manifest is adopted and rendered outputs are committed to `staccato-manifests/staccato-server/dev/k8s/`. After migration, the rendered manifests in `staccato-manifests` are the authoritative source; raw manifests in `src/ops/` SHALL NOT coexist with OAM-managed components.

#### Scenario: Server pod reaches Running state

- **WHEN** manifests are applied with `kubectl apply -f src/ops/dev/manifests/staccato-server/`
- **THEN** `kubectl get pods -n staccato` shows the staccato-server pod as `Running` within 60 seconds

#### Scenario: Metrics are scraped by Prometheus

- **WHEN** the server is running and ServiceMonitor is applied
- **THEN** the Prometheus targets page shows `staccato-server` as `UP`

#### Scenario: Raw manifests are absent after OAM migration

- **WHEN** the `staccato-server` OAM Application manifest has been adopted and rendered outputs committed to `staccato-manifests`
- **THEN** `src/ops/dev/manifests/staccato-server/` SHALL NOT exist in the source repository
