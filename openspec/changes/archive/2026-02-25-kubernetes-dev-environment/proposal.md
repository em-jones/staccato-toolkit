---
td-board: kubernetes-dev-environment
td-issue: td-567b55
---

# Proposal: Kubernetes Development Environment

## Why

There is no local Kubernetes cluster for developing and validating platform components. The observability stack (Prometheus, Grafana, Loki, Tempo), staccato services, and future workloads need a consistent, reproducible local environment that mirrors production topology. Without this, development is disconnected from real deployment conditions.

## What Changes

- Provision a local Kubernetes cluster using `kind` (Kubernetes in Docker)
- Deploy the observability stack (kube-prometheus-stack, Loki, Tempo, Grafana) via Helm
- Deploy `staccato-server` and `staccato-cli` as Kubernetes workloads
- Deploy the OpenTelemetry Collector as a DaemonSet routing OTLP → Prometheus/Loki/Tempo
- Add `kind` to `devbox.json` and provide a `make dev-up` / `make dev-down` workflow via Taskfile
- Document the dev environment setup in the architecture docs

## Capabilities

### New Capabilities

- `local-cluster-provisioning`: kind-based local Kubernetes cluster with configuration for the platform
- `observability-stack-deployment`: Helm deployment of kube-prometheus-stack, Loki, Tempo, Grafana, OTel Collector onto the dev cluster
- `service-deployment`: Kubernetes manifests (Deployment, Service, ConfigMap) for staccato-server and staccato-cli

### Modified Capabilities

_(none — all new)_

## Impact

- Affected services/modules: `devbox.json`, `Taskfile.yaml`, `src/ops/` (new k8s manifests), architecture docs
- API changes: No
- Data model changes: No
- Dependencies: `kind` (cluster), `kubectl`, `helm` (via devbox); requires `instrument-services-with-observability` change to be complete (images must exist)
