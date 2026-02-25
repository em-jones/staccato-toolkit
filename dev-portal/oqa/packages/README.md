# OQA Packages

This directory contains packages that implement the
[OQA Ecosystem Specification](../../../openspec/specs/oqa-ecosystem/spec.md).

## Overview

The OQA (Open Quality Assurance) ecosystem provides a compatibility layer that:

- Adopts OpenTelemetry signals (metrics, logs, traces) as foundational primitives
- Extends these signals with higher-level compliance concepts: **Performance**, **Errors**, and
  **Incidents**
- Defines standard UI components for rendering visualizations across all signal types

## Styling

All UI components in these packages use Tailwind CSS with the project's base preset. Client libraries that consume these packages can override the default styling by providing their own Tailwind configuration that extends or replaces the base preset.

## Packages

| Package                 | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| [domain](./domain/)     | TypeScript types for OQA specifications (generated from CUE spec) |
| [errors](./errors/)     | Error signal types and utilities                                  |
| [logging](./logging/)   | Logging utilities and OTel log integration                        |
| [metrics](./metrics/)   | Metrics utilities and OTel metric integration                     |
| [profiles](./profiles/) | User/team profiles for OQA                                        |
| [search](./search/)     | Search UI for OQA signals                                         |
| [traces](./traces/)     | UI Components for distributed tracing                             |
| [docs](./docs/)         | Documentation assets                                              |

## Signal Types

Per the OQA Ecosystem spec, these packages implement the extended signal types:

- **Performance Signal**: Quantitative measures (latency, throughput, resource utilization) - see
  `metrics`
- **Error Signal**: Failures, exceptions, and fault states - see `errors`
- **Incident Signal**: Stateful occurrences requiring response - see `domain`

## OTel Integration

All packages integrate with OpenTelemetry primitives:

- Metrics map to OTel histogram/summary metrics (`metrics`)
- Logs conform to OTel Log Record attributes (`logging`)
- Traces are representable as OTel Spans (`traces`)

## Compliance Frameworks

The domain package includes types for the Compliance Framework Registry:

- SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS
