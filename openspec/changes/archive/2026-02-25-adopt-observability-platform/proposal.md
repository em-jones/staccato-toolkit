---
td-board: adopt-observability-platform
td-issue: td-1495d1
---

# Proposal: Adopt Observability Platform

## Why

The platform toolkit manages services running on Kubernetes. Without observability, teams cannot understand how their services behave in any environment — they operate blind. The platform needs a unified, standardised observability stack that aggregates logs, metrics, and traces across all services, with a single pane of glass for querying and dashboarding.

The requirement is to prioritise maturity and industry standards compliance. The platform's component specification tool (KubeVela) is used to define and automate the provisioning of the observability stack, establishing the pattern for how all future platform components are adopted.

## What Changes

- Adopt the **OpenTelemetry + Prometheus + Grafana + Loki + Tempo** observability stack
- Define the observability stack as a **KubeVela OAM Application** manifest so it is provisioned via the component platform
- Install the stack in the local dev environment (kind cluster with KubeVela) for developer use
- Document the tool choices and rationale in an ADR-style design document

## Capabilities

### New Capabilities

- `observability-stack-rationale`: Design document making the case for the chosen observability tools (OpenTelemetry, Prometheus, Grafana, Loki, Tempo) and documenting alternatives considered
- `observability-kubevela-application`: KubeVela OAM Application manifest that provisions the observability stack via helm-backed components
- `observability-local-setup`: The observability stack is installed and verified in the local kind+KubeVela environment

### Modified Capabilities

*(none)*

## Impact

- Affected files: new OAM Application manifest, devbox.json (no new CLI tools — all tools installed in-cluster)
- API changes: None
- Data model changes: None
- Dependencies: KubeVela (from `adopt-component-platform`), kind cluster, Prometheus/Grafana helm charts
