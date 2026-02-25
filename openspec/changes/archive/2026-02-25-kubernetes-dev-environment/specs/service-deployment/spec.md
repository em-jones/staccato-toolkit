---
td-board: k8s-dev-service-deployment
td-issue: td-f5e79c
---

# Specification: Service Deployment

## Overview

`staccato-server` and `staccato-cli` SHALL be deployed as Kubernetes workloads in the `staccato` namespace, with ConfigMaps for OTel and logging configuration, and port-forward access for local development.

## ADDED Requirements

### Requirement: staccato-server Kubernetes manifests

Kubernetes manifests SHALL exist at `src/ops/dev/manifests/staccato-server/`. They SHALL include:
- `Deployment`: 1 replica, image `staccato-server:dev` (loaded into kind via `kind load docker-image`), `OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector.monitoring.svc.cluster.local:4317`, `LOG_LEVEL=debug`, liveness probe on `/healthz`, readiness probe on `/healthz`
- `Service`: ClusterIP on port 8080
- `ServiceMonitor`: pointing to port 8080 for Prometheus scraping

#### Scenario: Server pod reaches Running state

- **WHEN** manifests are applied with `kubectl apply -f src/ops/dev/manifests/staccato-server/`
- **THEN** `kubectl get pods -n staccato` shows the staccato-server pod as `Running` within 60 seconds

#### Scenario: Metrics are scraped by Prometheus

- **WHEN** the server is running and ServiceMonitor is applied
- **THEN** the Prometheus targets page shows `staccato-server` as `UP`

### Requirement: staccato-cli Kubernetes manifests

Kubernetes manifests SHALL exist at `src/ops/dev/manifests/staccato-cli/`. They SHALL include a `Job` (not a long-running Deployment) that runs `staccato-cli health` against the staccato-server Service URL, exits 0 on success.

#### Scenario: CLI job completes successfully

- **WHEN** the CLI Job is applied
- **THEN** `kubectl get jobs -n staccato` shows the job `Complete` and logs contain the server health response

### Requirement: Ingress and port-forward access for Grafana and services

A `task dev-grafana` Taskfile task SHALL run `kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring` for easy Grafana access. A `task dev-server` task SHALL port-forward `staccato-server` to `localhost:8080`. Both SHALL print the URL to the terminal on start.

#### Scenario: Grafana accessible via task

- **WHEN** `task dev-grafana` is run
- **THEN** `http://localhost:3000` serves the Grafana UI within 5 seconds

#### Scenario: Server accessible via task

- **WHEN** `task dev-server` is run
- **THEN** `curl http://localhost:8080/healthz` returns `{"status":"ok"}`
