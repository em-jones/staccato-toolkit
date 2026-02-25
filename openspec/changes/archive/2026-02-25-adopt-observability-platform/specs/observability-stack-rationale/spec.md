---
td-board: adopt-observability-platform-observability-stack-rationale
td-issue: td-287971
---

# Specification: Observability Stack Rationale

## Overview

Defines requirements for the design document that makes the case for adopting the OpenTelemetry + Prometheus + Grafana + Loki + Tempo observability stack, documenting the tool selection against alternatives.

## ADDED Requirements

### Requirement: Observability tool selection is documented

The platform SHALL include a design document that articulates why the chosen observability tools are appropriate, covering the three pillars of observability (logs, metrics, traces), maturity and CNCF status for each tool, and alternatives considered.

#### Scenario: All three observability pillars are addressed

- **WHEN** a developer reads the design document
- **THEN** they SHALL find an explicit mapping of each observability pillar (logs, metrics, traces) to the adopted tool, with rationale

#### Scenario: CNCF maturity is documented for each tool

- **WHEN** a reviewer reads the design document
- **THEN** each tool SHALL have its CNCF status documented (Graduated, Incubating, Sandbox, or non-CNCF with community status)

#### Scenario: Alternatives are documented

- **WHEN** a reviewer reads the design document
- **THEN** at least one alternative is documented per pillar with a rejection reason (e.g., Jaeger vs Tempo for traces, ELK vs Loki for logs, Datadog/New Relic as commercial alternatives)

### Requirement: OpenTelemetry as the instrumentation standard is documented

The design document SHALL explain why OpenTelemetry is adopted as the instrumentation standard (vendor-neutral telemetry protocol), separate from the specific backend tools.

#### Scenario: OTel role is clear

- **WHEN** a developer reads the design
- **THEN** they SHALL understand that OpenTelemetry is the *collection and transport* layer (not a backend), and how it feeds the Prometheus/Loki/Tempo backends
