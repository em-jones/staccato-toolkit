---
td-board: adopt-tempo-tracing-trace-sampling-strategy
td-issue: td-362478
---

# Specification: Trace Sampling Strategy

## Overview

Defines configuration and usage rules for adaptive sampling, probabilistic sampling, and tail-based sampling to manage trace volume and storage costs while maintaining visibility into errors and slow requests.

## ADDED Requirements

### Requirement: Probabilistic head sampling

Services SHALL use probabilistic sampling at the trace head (entry point) to reduce trace volume. The sampling rate SHALL be configurable per service, defaulting to 10% (0.1).

#### Scenario: Trace sampled at 10%

- **WHEN** a root span is created
- **THEN** there is a 10% probability the trace is sampled and 90% probability it is dropped

#### Scenario: Sample rate configuration

- **WHEN** a service initializes its tracer
- **THEN** the sampling rate is read from environment variable `OTEL_TRACES_SAMPLER_ARG` (or service configuration)

#### Scenario: Child spans inherit sampling decision

- **WHEN** a child span is created
- **THEN** it respects the parent trace's sampling decision (sampled or not sampled)

### Requirement: Error and latency-based tail sampling

Services SHALL support tail-based sampling rules that always sample traces containing errors or high latency. Tail sampling decisions SHALL be made before trace export, reducing egress volume.

#### Scenario: Error trace always sampled

- **WHEN** a trace contains a span with status ERROR or an exception event
- **THEN** the entire trace is sampled and exported, regardless of head sampling decision

#### Scenario: High latency trace always sampled

- **WHEN** a trace contains a span with duration > 5 seconds
- **THEN** the entire trace is sampled and exported

#### Scenario: Low-value trace dropped at tail

- **WHEN** a trace has no errors, latency < 5s, and was not sampled at head
- **THEN** the trace is dropped before export

### Requirement: Sampling decision propagation

When a trace's sampling decision is made at the tail, child services MUST be notified retroactively if implemented, or subsequent traces MUST respect the parent's sampling status.

#### Scenario: Sampling decision consistency

- **WHEN** a parent service makes a sampling decision
- **THEN** child services honor that decision for the same trace

#### Scenario: No retroactive replay

- **WHEN** a trace is sampled only at the tail (after being dropped by head sampling)
- **THEN** spans that were not exported cannot be retroactively retrieved

### Requirement: Sampling configuration and monitoring

Services SHALL export sampling decision and rate metrics for monitoring. Configuration changes MUST be reflected in logs and metrics.

#### Scenario: Sampling rate metric

- **WHEN** a service is running
- **THEN** it exports a metric `traces.sampled.rate` (percentage of traces sampled)

#### Scenario: Configuration change logging

- **WHEN** the sampling rate is changed via environment variable
- **THEN** a log entry records the change: `"sampling rate updated from X% to Y%"`

### Requirement: Sampling strategy for background and long-running tasks

Background tasks and batch jobs MUST use lower sampling rates (1-5%) to avoid overwhelming tracing infrastructure while still detecting failures.

#### Scenario: Background task sampling rate

- **WHEN** a background job's tracer is initialized
- **THEN** the sampling rate is set to 5% (configurable via `BACKGROUND_SAMPLING_RATE`)

#### Scenario: Batch job sampling rate

- **WHEN** a batch processing job creates spans
- **THEN** the sampling rate is set to 1% (configurable via `BATCH_SAMPLING_RATE`)

### Requirement: Sampling strategy for critical paths

Critical paths (payment processing, authentication) MUST use higher sampling rates (50-100%) to ensure full visibility into sensitive operations.

#### Scenario: Authentication critical path sampling

- **WHEN** a user authentication span is created
- **THEN** the trace is sampled with 100% probability

#### Scenario: Payment processing critical path sampling

- **WHEN** a payment transaction span is created
- **THEN** the trace is sampled with 100% probability
