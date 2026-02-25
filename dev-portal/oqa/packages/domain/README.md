# Domain

TypeScript types for OQA specifications (generated from CUE spec).

## Extended Signals

This package provides types for the three OQA extended signal types defined in the [OQA Ecosystem Spec](../../../openspec/specs/oqa-ecosystem/spec.md):

- **PerformanceSignal**: Latency, throughput, cpu_utilization metrics
- **ErrorSignal**: Error conditions with severity tracking
- **IncidentSignal**: Stateful incidents with severity, affected_services, and resolution_status

## Compliance Registry

Types for the compliance framework registry:

- SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS

## UI Component Props

Standard props interface for OQA UI components:

- `signal`: The data object to render
- `title`: Optional display title override
- `timeRange`: Time window (e.g., "1h", "24h", "7d")
- `onClick`: Optional callback
- `theme`: Light/dark theme override
