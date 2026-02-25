---
td-board: oqa-ecosystem-ui-components
td-issue: 
---

# Specification: OQA Ecosystem

## Overview

OQA (Open Quality Assurance) is an ecosystem for cataloging compliance-oriented specifications while extending existing observability standards. It serves as a compatibility layer that:

- Adopts OpenTelemetry signals (metrics, logs, traces) as foundational primitives
- Extends these signals with higher-level compliance concepts: **Performance**, **Errors**, and **Incidents**
- Defines standard UI components for rendering visualizations across all signal types
- Provides a registry for referencing existing compliance frameworks (SOC 2, ISO 27001, GDPR, HIPAA)

## Requirements
### Requirement: OpenTelemetry Signal Adoption

The OQA ecosystem SHALL adopt OpenTelemetry as the primary signal foundation. All metrics, logs, and traces MUST be representable in OpenTelemetry formats.

#### Scenario: OTel metrics integration

- **WHEN** a compliance metric is defined in OQA
- **THEN** it MUST be mappable to an OpenTelemetry Metric data point

#### Scenario: OTel logs integration

- **WHEN** a compliance event is logged
- **THEN** it MUST conform to OpenTelemetry Log Record attributes

#### Scenario: OTel traces integration

- **WHEN** a compliance workflow is traced
- **THEN** it MUST be representable as OpenTelemetry Spans with attributes

### Requirement: Extended Signal Definitions

OQA SHALL define three extended signal types that build upon OpenTelemetry primitives:

1. **Performance Signal**: Quantitative measures of system behavior (latency, throughput, resource utilization)
2. **Error Signal**: Conditions representing failures, exceptions, and fault states
3. **Incident Signal**: Stateful occurrences that represent operational issues requiring response

#### Scenario: Performance signal derived from metrics

- **WHEN** a Performance signal is requested
- **THEN** it is computed from OpenTelemetry histogram/summary metrics representing latency_percentile, throughput, and cpu_utilization

#### Scenario: Error signal derived from logs and metrics

- **WHEN** an Error signal is requested
- **THEN** it aggregates OpenTelemetry log records with severity >= ERROR and counter metrics for error counts

#### Scenario: Incident signal represents stateful occurrence

- **WHEN** an Incident signal is created
- **THEN** it includes: start_time (timestamp), severity (critical/major/minor), affected_services (list), and resolution_status (open/acknowledged/resolved)

### Requirement: Compliance Framework Registry

OQA SHALL maintain a registry of known compliance frameworks. The registry SHALL include:

- SOC 2 (Service Organization Control 2)
- ISO 27001 (Information Security Management)
- GDPR (General Data Protection Regulation)
- HIPAA (Health Insurance Portability and Accountability Act)
- PCI DSS (Payment Card Industry Data Security Standard)

#### Scenario: Framework reference retrieved

- **WHEN** a query requests compliance controls for SOC 2
- **THEN** the registry returns mapped OQA signals that satisfy those controls

### Requirement: Standard UI Component Library

OQA SHALL define a standard set of UI components for rendering signal visualizations. The component library MUST support the following component types:

1. **SignalCard**: Displays summary information for a single signal (name, current value, trend indicator)
2. **TimeSeriesChart**: Renders temporal data for metrics and performance signals
3. **LogTable**: Displays log entries with filtering, sorting, and search capabilities
4. **TraceView**: Visualizes distributed traces with span details and timing information
5. **IncidentTimeline**: Shows incident history with status transitions
6. **SignalGrid**: Layout component for arranging multiple SignalCards in a responsive grid
7. **AlertBadge**: Displays alert/severity state with appropriate styling
8. **ServiceMap**: Renders service relationships and dependency topology

#### Scenario: SignalCard renders performance metric

- **WHEN** a SignalCard component is provided with a Performance signal of type `latency_p99`
- **THEN** it displays: signal name "Latency p99", current value in milliseconds, trend arrow (up/down/stable), and color coding based on threshold

#### Scenario: TimeSeriesChart renders metric data

- **WHEN** a TimeSeriesChart component is provided with historical data points
- **THEN** it renders a line/area chart with: X-axis (time), Y-axis (value), tooltip on hover, and optional threshold lines

#### Scenario: LogTable renders log entries

- **WHEN** a LogTable component is provided with log records
- **THEN** it displays: timestamp column, severity level with color coding, service name, and message with expandable details

#### Scenario: TraceView renders distributed trace

- **WHEN** a TraceView component is provided with span data
- **THEN** it renders: waterfall timeline showing span durations, service names per span, and expandable span attributes

#### Scenario: IncidentTimeline renders incidents

- **WHEN** an IncidentTimeline component is provided with incident records
- **THEN** it displays: chronological list of incidents with status badges, duration, and affected service count

### Requirement: Component Props Standardization

All OQA UI components SHALL follow consistent prop naming conventions:

- `signal`: The data object to render
- `title`: Optional display title override
- `timeRange`: Time window for data retrieval (e.g., "1h", "24h", "7d")
- `onClick`: Optional callback for interactivity
- `theme`: Light/dark theme override

#### Scenario: Consistent prop usage across components

- **WHEN** a developer uses SignalCard and TimeSeriesChart
- **THEN** both components accept the `signal` prop with compatible data types

### Requirement: Theme and Accessibility Compliance

OQA UI components SHALL support:

- Light and dark themes with consistent color palette
- Colorblind-safe color schemes by default
- Keyboard navigation support
- ARIA labels for screen readers
- Responsive design for mobile/tablet/desktop breakpoints

#### Scenario: Component renders in dark theme

- **WHEN** a SignalCard is rendered with `theme="dark"`
- **THEN** background colors, text colors, and border colors adapt to dark palette

#### Scenario: Screen reader announces component state

- **WHEN** an AlertBadge displays severity "critical"
- **THEN** it includes `aria-label="Critical severity alert"`

## Considerations

### Open Policy Agent (OPA) Integration

OPA could enhance OQA in the following ways:

1. **Signal Validation**: Rego policies to validate that extended signals (Performance, Error, Incident) properly map to OTel primitives
2. **Compliance Mapping**: Policies that map OQA signals to control requirements from registered compliance frameworks
3. **Component Standards**: Validate UI components follow prop standardization rules
4. **Access Control**: Gate who can create/modify specifications based on role

Integration can be achieved via:
- Embedded Go API for runtime validation
- Standalone REST API for policy decisions
- Wasm/Envoy sidecar for admission control

## MODIFIED Requirements

(None - this is a new capability)