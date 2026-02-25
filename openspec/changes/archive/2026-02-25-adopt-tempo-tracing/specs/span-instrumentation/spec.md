---
td-board: adopt-tempo-tracing-span-instrumentation
td-issue: td-b7c14d
---

# Specification: Span Instrumentation

## Overview

Defines usage rules for instrumenting spans with attributes, events, and semantic conventions. Ensures consistent span naming, attribute cardinality, and event recording across all services.

## ADDED Requirements

### Requirement: Span naming conventions

Services SHALL use consistent span names following the pattern `<service>.<operation>` (e.g., `user-api.get_user`, `auth-service.validate_token`). Span names MUST be statically determinable and low-cardinality.

#### Scenario: HTTP handler span naming

- **WHEN** an HTTP request handler creates a span
- **THEN** the span name is `<service>.<http_method>_<route>` (e.g., `user-api.get_users`)

#### Scenario: Database operation span naming

- **WHEN** a database operation is instrumented
- **THEN** the span name is `<service>.db.<operation>` (e.g., `user-api.db.query`)

### Requirement: Span attribute cardinality management

Each span SHALL have no more than 32 attributes. Attributes with high cardinality values (e.g., user IDs, request IDs) MUST be redacted or omitted unless explicitly required for root-cause analysis.

#### Scenario: Low cardinality attribute inclusion

- **WHEN** a span records HTTP status code
- **THEN** it includes attribute `http.status_code` with the numeric code value

#### Scenario: High cardinality attribute redaction

- **WHEN** a span would record a user ID or request ID
- **THEN** it includes only the first 8 characters (e.g., `request_id: "abc123de..."`) or is omitted entirely

### Requirement: Span event recording

Services SHALL record span events for noteworthy conditions (exceptions, warnings, checkpoints). Events MUST include a timestamp, name, and relevant attributes.

#### Scenario: Exception event recording

- **WHEN** a non-transient error occurs during span execution
- **THEN** a span event is recorded with name `exception`, attributes `exception.type` and `exception.message`

#### Scenario: Checkpoint event recording

- **WHEN** a long-running operation completes a major phase
- **THEN** a span event is recorded with name describing the checkpoint (e.g., `cache_check_complete`)

### Requirement: Semantic convention compliance

Services SHALL use OpenTelemetry semantic conventions for common span attributes. Refer to `https://opentelemetry.io/docs/specs/semconv/` for the full reference.

#### Scenario: HTTP semantic attributes

- **WHEN** an HTTP span is created
- **THEN** it includes attributes from the HTTP semantic convention: `http.method`, `http.url`, `http.status_code`, `http.target`

#### Scenario: Database semantic attributes

- **WHEN** a database span is created
- **THEN** it includes attributes from the database semantic convention: `db.system`, `db.name`, `db.operation`, `db.statement` (if safe to record)

### Requirement: Resource attributes

All spans from a service MUST include resource attributes identifying the service, version, and environment. These MUST be set at tracer initialization.

#### Scenario: Resource attribute initialization

- **WHEN** a tracer is created for a service
- **THEN** the tracer resource includes attributes: `service.name`, `service.version`, `deployment.environment`

#### Scenario: Span inherits resource attributes

- **WHEN** a span is created from the tracer
- **THEN** the span includes all resource attributes in its context
