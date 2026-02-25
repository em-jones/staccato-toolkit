---
td-board: adopt-tempo-tracing-trace-context-propagation
td-issue: td-bb2f63
---

# Specification: Trace Context Propagation

## Overview

Defines patterns for propagating trace context across service boundaries and async operations. Ensures trace continuity in distributed systems with synchronous RPC, async message queues, and HTTP requests.

## ADDED Requirements

### Requirement: W3C Trace Context propagation for HTTP

Services SHALL use W3C Trace Context (traceparent header) for propagating trace context in HTTP requests. Both incoming and outgoing HTTP clients MUST extract and inject the traceparent header.

#### Scenario: HTTP client injects trace context

- **WHEN** a service makes an outgoing HTTP request
- **THEN** the `traceparent` header is set to the current span's trace context

#### Scenario: HTTP handler extracts trace context

- **WHEN** a service receives an HTTP request with a `traceparent` header
- **THEN** a new span is created as a child of the extracted trace context

#### Scenario: HTTP handler without trace context

- **WHEN** a service receives an HTTP request without a `traceparent` header
- **THEN** a new root span is created (new trace)

### Requirement: Trace context propagation in async message queues

Services using message queues (e.g., Kafka, RabbitMQ) SHALL propagate trace context through message headers. The trace context MUST be injected when publishing and extracted when consuming.

#### Scenario: Kafka producer injects trace context

- **WHEN** a service publishes a message to Kafka
- **THEN** the producer includes trace context in the message headers (using W3C Trace Context format)

#### Scenario: Kafka consumer extracts trace context

- **WHEN** a service consumes a message from Kafka
- **THEN** the consumer extracts trace context from message headers and creates a child span

#### Scenario: Message processing chain

- **WHEN** multiple services process the same message sequentially
- **THEN** all spans from all services share the same trace ID, forming a continuous trace

### Requirement: Context propagation in goroutines and background tasks

Services SHALL propagate trace context to child goroutines and background tasks. The context MUST be passed explicitly or via context.Context.

#### Scenario: Goroutine inherits trace context

- **WHEN** a goroutine is spawned from a span-executing function
- **THEN** the goroutine's spans are created with the same trace ID as the parent

#### Scenario: Background task deferred execution

- **WHEN** a background task is scheduled for later execution
- **THEN** the task receives the trace context snapshot at schedule time, not execution time

### Requirement: Baggage propagation for metadata

Services MAY propagate baggage (user ID, tenant ID, feature flags) across trace boundaries. Baggage MUST be explicitly defined and never exceed 256 key-value pairs per trace.

#### Scenario: Tenant ID in baggage

- **WHEN** a request identifies the tenant
- **THEN** the tenant ID is stored in baggage and propagated to all downstream services

#### Scenario: Baggage size limit

- **WHEN** baggage accumulates more than 256 key-value pairs
- **THEN** the oldest entries are dropped and an event is logged

### Requirement: Trace context stripping at boundaries

Services SHALL strip trace context when crossing trust boundaries (e.g., forwarding to external services). External service traces MUST start with a new root span.

#### Scenario: Internal service to internal service

- **WHEN** a service calls another internal service
- **THEN** trace context is propagated and spans share the same trace ID

#### Scenario: Internal service to external service

- **WHEN** a service calls an external third-party API
- **THEN** trace context is NOT propagated; a new root span is created for the external call
