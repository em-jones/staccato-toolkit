---
td-board: instrument-services-server-http-foundation
td-issue: td-12c5fc
---

# Specification: Server HTTP Foundation

## Overview

`staccato-server` SHALL be a real HTTP service with health, metrics, and API endpoints. It MUST be buildable into an OCI container image and runnable in Kubernetes.

## ADDED Requirements

### Requirement: Health check endpoint

`staccato-server` SHALL expose `GET /healthz` returning HTTP 200 with JSON body `{"status":"ok"}`. The endpoint MUST respond within 100ms under normal conditions and MUST NOT depend on external services (liveness probe safe).

#### Scenario: Healthy server responds

- **WHEN** a client sends `GET /healthz`
- **THEN** the server responds HTTP 200 with `Content-Type: application/json` and body `{"status":"ok"}`

#### Scenario: Health check available immediately on startup

- **WHEN** the server process starts
- **THEN** `/healthz` is reachable within 2 seconds of process start

### Requirement: Prometheus metrics endpoint

`staccato-server` SHALL expose `GET /metrics` in Prometheus text exposition format. The endpoint MUST be served by the `promhttp.Handler()` from `prometheus/client_golang`. The default Go runtime metrics (goroutines, GC, memory) MUST be included automatically.

#### Scenario: Metrics endpoint returns Prometheus format

- **WHEN** a client sends `GET /metrics`
- **THEN** the server responds HTTP 200 with `Content-Type: text/plain; version=0.0.4` and Prometheus exposition text

#### Scenario: Default runtime metrics present

- **WHEN** the metrics endpoint is scraped
- **THEN** the response includes `go_goroutines`, `go_memstats_alloc_bytes`, and `process_cpu_seconds_total`

### Requirement: Stub API endpoint

`staccato-server` SHALL expose `GET /api/v1/status` returning HTTP 200 with JSON `{"service":"staccato-server","version":"dev"}`. This endpoint exists to provide a real traced HTTP path for end-to-end observability validation.

#### Scenario: Status endpoint returns service info

- **WHEN** a client sends `GET /api/v1/status`
- **THEN** the server responds HTTP 200 with `Content-Type: application/json` and JSON body containing `service` and `version` fields
