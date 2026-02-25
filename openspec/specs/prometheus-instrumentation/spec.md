---
td-board: adopt-prometheus-metrics-prometheus-instrumentation
td-issue: td-c694e1
---

# Specification: Prometheus Instrumentation

## Overview

This spec defines the standard for instrumenting services with Prometheus metrics. It establishes patterns for initializing Prometheus clients, registering metrics, and collecting measurements within application code.

## ADDED Requirements

### Requirement: Prometheus Client Initialization

Services consuming Prometheus SHALL initialize a Prometheus client at startup, configuring it with service identity metadata (service name, version, environment) and registering it with appropriate collectors.

#### Scenario: Client initialization in service startup
- **WHEN** a service starts
- **THEN** it initializes a Prometheus client with service name, version, and environment labels

#### Scenario: Default registry configuration
- **WHEN** Prometheus client initializes
- **THEN** it uses the default Prometheus registry or a custom registry explicitly configured

### Requirement: Metric Registration Pattern

All metrics used by a service SHALL be explicitly registered at initialization time, defining metric name, type, help text, and label dimensions before collection begins.

#### Scenario: Counter registration
- **WHEN** a service needs to track request count
- **THEN** it registers a Counter metric at startup with name, help text, and label names

#### Scenario: Gauge registration
- **WHEN** a service needs to track current resource state
- **THEN** it registers a Gauge metric at startup

#### Scenario: Histogram registration
- **WHEN** a service needs to track request latencies
- **THEN** it registers a Histogram metric at startup with bucket configuration

### Requirement: Metric Collection in Request Lifecycle

Services SHALL collect metrics at appropriate points in request processing: request start (timestamp), completion (duration/status), and error conditions. Metric collection MUST be non-blocking and not impact request latency.

#### Scenario: Request duration tracking
- **WHEN** a request completes
- **THEN** the service records request duration in a Histogram metric

#### Scenario: Error rate tracking
- **WHEN** a request fails
- **THEN** the service increments an error counter with error type label

#### Scenario: Concurrent request tracking
- **WHEN** a request begins and ends
- **THEN** a Gauge tracking in-flight requests increments on start and decrements on completion

### Requirement: Label Value Constraints

Metric label values SHALL have constraints applied (cardinality limits, allowed values) to prevent unbounded metric growth and ensure cardinality budgets are respected.

#### Scenario: User ID label constraints
- **WHEN** a metric includes a user ID label
- **THEN** the application enforces a maximum cardinality (e.g., top 100 users) or uses bucketing to limit values

#### Scenario: Error type categorization
- **WHEN** tracking error metrics
- **THEN** error types are explicitly enumerated (e.g., `timeout`, `invalid_input`, `service_error`) rather than using raw error messages

### Requirement: /metrics Endpoint Exposure

Services SHALL expose metrics via an HTTP `/metrics` endpoint using the Prometheus text exposition format (version 0.0.4), responding to GET requests with the complete metric set.

#### Scenario: Metrics endpoint response
- **WHEN** a client requests GET `/metrics`
- **THEN** the service responds with HTTP 200 and Prometheus-formatted output including all registered metrics

#### Scenario: Content-Type header
- **WHEN** `/metrics` endpoint responds
- **THEN** the response includes `Content-Type: text/plain; version=0.0.4`

### Requirement: Metric Naming Convention Compliance

Metric names SHALL follow Prometheus naming conventions: lowercase, snake_case, units in suffixes (_total, _seconds, _bytes), service prefix.

#### Scenario: Counter naming
- **WHEN** naming a counter metric
- **THEN** it follows pattern: `<service>_<subsystem>_<operation>_total` (e.g., `api_gateway_requests_total`)

#### Scenario: Gauge naming
- **WHEN** naming a gauge metric
- **THEN** it follows pattern: `<service>_<subsystem>_<resource>` (e.g., `api_gateway_memory_bytes`)

#### Scenario: Histogram naming
- **WHEN** naming a histogram metric
- **THEN** it follows pattern: `<service>_<subsystem>_<operation>_seconds` (e.g., `api_gateway_request_duration_seconds`)

### Requirement: Instrumentation Testing

Unit tests for instrumented code SHALL verify that metrics are collected correctly for success and failure scenarios, without making actual metrics queries against Prometheus.

#### Scenario: Counter increment verification
- **WHEN** testing code that increments a counter
- **THEN** test mocks or introspects the Prometheus client to verify the counter was incremented

#### Scenario: Label value verification
- **WHEN** testing metrics with labels
- **THEN** test verifies that label values match expected values

## REMOVED Requirements

None

