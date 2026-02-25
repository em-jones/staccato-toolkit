---
td-board: select-go-logging-library
td-issue: td-5311ef
---

# Proposal: Select Go Logging Library

## Why

The platform currently uses `log/slog` (Go stdlib) for structured logging without formal evaluation or decision. The OpenTelemetry logs signal (OTLP log export) is not wired — logs only go to stdout, relying on Promtail to scrape them into Loki. This prevents unified observability (traces, metrics, logs) through the OTel Collector and creates a gap in our observability strategy. We need a formal decision on the Go logging library that supports the OTel logs bridge for OTLP export.

## What Changes

- **Evaluate** Go logging library candidates (`log/slog`, `zerolog`, `zap`) against decision criteria: OTel logs signal support (40%), structured output/context propagation (25%), performance (15%), stdlib compatibility/minimal dependencies (20%)
- **Select** the logging library for platform-wide adoption based on evaluation results
- **Document** the decision rationale and migration path in design.md
- **Eliminate** the global `var logger *slog.Logger` anti-pattern in `staccato-server/main.go` — replace with dependency injection via function parameters or context
- **Wire** the OTel logs bridge (e.g., `go.opentelemetry.io/contrib/bridges/otelslog` for slog) into `InitTelemetry` to enable OTLP log export
- **Create** usage rules for the selected logging library in `.opencode/rules/technologies/`
- **Update** observability instrumentation skill to include logging setup patterns

## Capabilities

### New Capabilities

- `go-logging-library-selection`: Formal evaluation and selection of the Go logging library with OTel logs signal support, elimination of global logger anti-pattern, and OTLP log export integration

### Modified Capabilities

_(none — this is a new decision/evaluation change)_

## Impact

- **Affected code**: 
  - `src/staccato-toolkit/server/main.go` (global logger variable)
  - `src/staccato-toolkit/domain/pkg/telemetry/telemetry.go` (InitTelemetry function)
  - `src/staccato-toolkit/domain/pkg/telemetry/slog.go` (TraceHandler integration with OTel bridge)
- **API changes**: No external API changes — internal logging initialization only
- **Data model changes**: No data model changes — log structure remains JSON with trace_id/span_id fields
- **Dependencies**: 
  - Add `go.opentelemetry.io/contrib/bridges/otelslog` (if slog is selected)
  - OR add `go.opentelemetry.io/contrib/bridges/otelzap` (if zap is selected)
  - OR add `github.com/rs/zerolog` + custom bridge (if zerolog is selected)
- **Observability impact**: Logs will flow through OTel Collector → Loki instead of Promtail → Loki, enabling unified observability pipeline
