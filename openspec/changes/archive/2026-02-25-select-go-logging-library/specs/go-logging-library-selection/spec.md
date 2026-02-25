---
td-board: select-go-logging-library-go-logging-library-selection
td-issue: td-41b9cc
---

# Specification: Go Logging Library Selection

## Overview

This specification defines the requirements for selecting and adopting a Go logging library that supports the OpenTelemetry logs signal (OTLP export), eliminates global logger anti-patterns, and integrates with the existing observability stack (OTel Collector → Loki).

## ADDED Requirements

### Requirement: Logging library selected with documented rationale

The platform SHALL have a formally selected Go logging library with documented evaluation rationale. The evaluation MUST assess candidates (`log/slog`, `zerolog`, `zap`) against weighted decision criteria: OTel logs signal support (40%), structured output/context propagation (25%), performance (15%), and stdlib compatibility/minimal dependencies (20%). The decision MUST be documented in `design.md` with evaluation matrix and rationale.

#### Scenario: Evaluation matrix complete

- **WHEN** the evaluation is complete
- **THEN** `design.md` contains a comparison table with all three candidates scored against the four weighted criteria
- **THEN** the selected library is clearly identified with justification

#### Scenario: Decision criteria applied

- **WHEN** evaluating candidates
- **THEN** OTel logs signal support (official bridge availability) is weighted at 40%
- **THEN** structured output and context propagation capabilities are weighted at 25%
- **THEN** performance (allocation overhead, throughput) is weighted at 15%
- **THEN** stdlib compatibility and minimal dependencies are weighted at 20%

### Requirement: OTel logs bridge integrated into telemetry initialization

The `InitTelemetry` function in `domain/pkg/telemetry/telemetry.go` SHALL initialize an OpenTelemetry LoggerProvider and wire the selected logging library's OTel bridge (e.g., `go.opentelemetry.io/contrib/bridges/otelslog` for slog). The LoggerProvider MUST export log records via OTLP/gRPC to the OpenTelemetry Collector using the same endpoint as traces and metrics. The existing `TraceHandler` pattern SHALL be preserved and integrated with the OTel bridge.

#### Scenario: LoggerProvider initialized

- **WHEN** `InitTelemetry` is called
- **THEN** a LoggerProvider is created with OTLP/gRPC exporter
- **THEN** the exporter uses the same `OTEL_EXPORTER_OTLP_ENDPOINT` as traces and metrics
- **THEN** the LoggerProvider is set as the global OTel logger provider

#### Scenario: Logging bridge configured

- **WHEN** the logging library is initialized
- **THEN** the OTel bridge (e.g., `otelslog.NewHandler`) wraps the base handler
- **THEN** log records are forwarded to the LoggerProvider
- **THEN** trace_id and span_id are automatically included in log records via the bridge

#### Scenario: TraceHandler integration preserved

- **WHEN** using slog with the otelslog bridge
- **THEN** the existing `TraceHandler` pattern can be layered with the bridge
- **THEN** trace context injection continues to work for stdout logs
- **THEN** OTLP-exported logs also contain trace_id and span_id

### Requirement: Global logger variable eliminated

The global `var logger *slog.Logger` in `staccato-server/main.go` SHALL be eliminated. Loggers MUST be injected via function parameters or retrieved from context using `slog.Default()` or equivalent. No package-level or global logger variables SHALL exist in service code.

#### Scenario: Logger injected via parameter

- **WHEN** a function requires logging
- **THEN** the logger is passed as a function parameter
- **THEN** no global logger variable is accessed

#### Scenario: Logger retrieved from context

- **WHEN** a function requires logging in a context-aware flow
- **THEN** the logger is retrieved using `slog.Default()` or equivalent
- **THEN** the default logger is set during service initialization via `slog.SetDefault()`

#### Scenario: No global logger variables

- **WHEN** auditing service code
- **THEN** no `var logger *slog.Logger` or equivalent global variables exist
- **THEN** all logger instances are created in `main()` or injected via DI

### Requirement: Usage rules created for selected logging library

A usage rule file SHALL be created at `.opencode/rules/technologies/<library>.md` (e.g., `slog.md`, `zap.md`, `zerolog.md`) documenting the selected library's usage patterns, OTel bridge setup, context propagation, and anti-patterns to avoid. The rule MUST include examples of correct initialization, trace context injection, and OTLP export configuration.

#### Scenario: Usage rule file created

- **WHEN** the logging library is selected
- **THEN** a usage rule file exists at `.opencode/rules/technologies/<library>.md`
- **THEN** the file documents OTel bridge setup with code examples
- **THEN** the file includes anti-patterns (e.g., global logger variables)

#### Scenario: Usage rule includes OTel bridge setup

- **WHEN** reading the usage rule
- **THEN** it shows how to initialize the OTel LoggerProvider
- **THEN** it shows how to wire the bridge (e.g., `otelslog.NewHandler`)
- **THEN** it shows how to configure OTLP export endpoint

#### Scenario: Usage rule includes context propagation patterns

- **WHEN** reading the usage rule
- **THEN** it shows how to pass loggers via function parameters
- **THEN** it shows how to use `slog.Default()` or equivalent
- **THEN** it shows how trace_id/span_id are automatically included

### Requirement: Observability instrumentation skill updated

The `.opencode/skills/observability-instrumentation/SKILL.md` skill SHALL be updated to include logging setup patterns using the selected library and OTel bridge. The skill MUST document the complete initialization flow: LoggerProvider creation, bridge configuration, and integration with existing TraceHandler pattern.

#### Scenario: Skill includes logging setup

- **WHEN** reading the observability-instrumentation skill
- **THEN** it includes a section on logging library setup
- **THEN** it documents the OTel LoggerProvider initialization
- **THEN** it shows how to wire the bridge with the base handler

#### Scenario: Skill shows complete initialization flow

- **WHEN** following the skill's logging setup instructions
- **THEN** it covers LoggerProvider creation with OTLP exporter
- **THEN** it covers bridge configuration (e.g., `otelslog.NewHandler`)
- **THEN** it covers integration with TraceHandler for trace context injection
- **THEN** it covers setting the default logger via `slog.SetDefault()` or equivalent
