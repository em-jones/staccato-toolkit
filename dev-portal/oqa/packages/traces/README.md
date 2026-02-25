# OQA Traces

UI Components for creating robust tracing UIs.

## Alignment with OQA Ecosystem Spec

This package provides UI components for visualizing OpenTelemetry traces, fulfilling the **TraceView** component requirement:

### Components

- **TraceView**: Visualizes distributed traces with span details and timing
  - Waterfall timeline showing span durations
  - Service names per span
  - Expandable span attributes
- **ServiceMap**: Renders service relationships and dependency topology

### Props Standardization

All components follow OQA prop conventions:

- `signal`: Trace/span data object
- `timeRange`: Time window for data retrieval
- `onClick`: Click handler for drill-down
- `theme`: Light/dark theme support
