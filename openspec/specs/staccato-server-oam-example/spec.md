---
td-board: oam-application-pattern-staccato-server-oam-example
td-issue: td-cdf662
---

# Specification: staccato-server OAM Example

## Overview

Defines the reference implementation of the OAM Application manifest for `staccato-server`. This working example demonstrates all required elements of the `oam-application-manifest` pattern: `webservice` component type, `prometheus-scrape` trait, and `ingress` trait. It serves as the canonical model that future components MUST follow.

## ADDED Requirements

### Requirement: staccato-server app.yaml exists at canonical path

A working OAM `Application` manifest for `staccato-server` SHALL exist at `src/staccato-toolkit/server/app.yaml` in the `staccato-toolkit` source repository.

#### Scenario: app.yaml is present and parseable

- **WHEN** a developer clones the `staccato-toolkit` repository and navigates to `src/staccato-toolkit/server/`
- **THEN** `app.yaml` SHALL exist and be valid YAML with `kind: Application` and `apiVersion: core.oam.dev/v1beta1`

### Requirement: staccato-server Application uses webservice type with required properties

The `staccato-server` `Application` manifest SHALL declare exactly one component under `spec.components[]` with `type: webservice` and a `properties` block containing: `image` (string, the container image reference), `port` (integer, `8080`), `env` (list of name/value pairs including at minimum `OTEL_EXPORTER_OTLP_ENDPOINT` and `LOG_LEVEL`), `livenessProbe` (HTTP GET `/healthz` on port `8080`), and `readinessProbe` (HTTP GET `/healthz` on port `8080`).

#### Scenario: staccato-server pod starts Running after vela up

- **WHEN** `vela up -f src/staccato-toolkit/server/app.yaml` is executed against a cluster with `webservice` ComponentDefinition registered
- **THEN** `kubectl get pods -n staccato` SHALL show a `staccato-server` pod in `Running` state within 60 seconds

#### Scenario: Rendered Deployment includes OTEL env var

- **WHEN** `vela export -f src/staccato-toolkit/server/app.yaml` is executed
- **THEN** the output `Deployment` manifest SHALL include an environment variable `OTEL_EXPORTER_OTLP_ENDPOINT` in `spec.template.spec.containers[0].env`

#### Scenario: Rendered Deployment includes liveness and readiness probes

- **WHEN** `vela export -f src/staccato-toolkit/server/app.yaml` is executed
- **THEN** the output `Deployment` manifest SHALL include both `livenessProbe` and `readinessProbe` configured as HTTP GET against `/healthz` on port `8080`

### Requirement: staccato-server Application attaches prometheus-scrape trait

The `staccato-server` `Application` manifest SHALL include a trait entry with `type: prometheus-scrape` and `properties.port: 8080`. This results in a rendered `ServiceMonitor` that configures Prometheus to scrape the `/metrics` endpoint.

#### Scenario: Rendered ServiceMonitor scrapes staccato-server

- **WHEN** `vela export` is run on the staccato-server Application manifest
- **THEN** the output SHALL include a `ServiceMonitor` resource with `endpoints[].port` equal to `8080`

#### Scenario: Prometheus shows staccato-server target as UP

- **WHEN** the rendered manifests are applied to the cluster and the server is running
- **THEN** the Prometheus targets page SHALL show `staccato-server` with status `UP`

### Requirement: staccato-server Application attaches ingress trait

The `staccato-server` `Application` manifest SHALL include a trait entry with `type: ingress` and `properties.domain` set to `staccato-server.local` (dev environment). This results in a rendered `Ingress` resource routing external traffic to the server.

#### Scenario: Rendered Ingress routes to staccato-server

- **WHEN** `vela export` is run on the staccato-server Application manifest
- **THEN** the output SHALL include an `Ingress` resource with `spec.rules[0].host: staccato-server.local` routing to port `8080`

### Requirement: staccato-server renders to all required Kubernetes resources

Running `vela export` on the `staccato-server` `Application` manifest SHALL produce at minimum the following Kubernetes resources: `Deployment`, `Service`, `ServiceMonitor`, and `Ingress`. These outputs SHALL be written to `staccato-manifests/staccato-server/dev/k8s/` per the `rendered-manifests-layout` convention.

#### Scenario: All expected resource files exist after render

- **WHEN** the render pipeline runs for the `staccato-server` component against the `dev` environment
- **THEN** the following files SHALL exist in `staccato-manifests/staccato-server/dev/k8s/`: `deployment.yaml`, `service.yaml`, `service-monitor.yaml`, `ingress.yaml`

#### Scenario: Rendered resources are all valid Kubernetes YAML

- **WHEN** `kubectl apply --dry-run=server -f staccato-manifests/staccato-server/dev/k8s/` is executed
- **THEN** all files SHALL be accepted by the API server dry-run without validation errors
