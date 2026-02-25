---
td-board: adopt-prometheus-metrics-prometheus-metrics-design
td-issue: td-d31389
---

# Specification: Prometheus Metrics Design

## Overview

This spec defines the strategy for designing metrics that align with Prometheus best practices: metric naming, type selection (counter/gauge/histogram/summary), label cardinality management, and documentation.

## ADDED Requirements

### Requirement: Metric Type Selection Strategy

Services SHALL select the appropriate Prometheus metric type based on the measurement semantics: Counter for monotonically increasing values, Gauge for values that can increase or decrease, Histogram/Summary for distributions.

#### Scenario: Selecting Counter for request count
- **WHEN** measuring cumulative request count
- **THEN** a Counter metric type is chosen as value only increases

#### Scenario: Selecting Gauge for memory usage
- **WHEN** measuring current memory consumption
- **THEN** a Gauge metric type is chosen as value can increase or decrease

#### Scenario: Selecting Histogram for latency
- **WHEN** measuring request latency distribution
- **THEN** a Histogram metric type is chosen to enable percentile calculations

### Requirement: Metric Naming and Documentation

Each metric SHALL have a clear, descriptive name following Prometheus conventions, with documentation explaining its purpose, units, and interpretation.

#### Scenario: Metric documentation
- **WHEN** defining a metric
- **THEN** documentation includes purpose, unit, and how to interpret the value

#### Scenario: Unit inclusion in name
- **WHEN** naming a metric with units
- **THEN** units are included in the metric name (e.g., `_seconds`, `_bytes`, `_total`)

### Requirement: Label Strategy and Cardinality

Metrics SHALL use labels strategically to enable filtering and aggregation, with explicit cardinality limits to prevent metric explosion.

#### Scenario: Service label inclusion
- **WHEN** defining a metric collected by multiple services
- **THEN** a `service` label is included to enable per-service filtering

#### Scenario: Status label cardinality limit
- **WHEN** adding a status label to track response codes
- **THEN** values are constrained (e.g., success, client_error, server_error) rather than using raw HTTP status codes

#### Scenario: User ID cardinality budgeting
- **WHEN** considering adding a user ID label
- **THEN** cardinality implications are evaluated and alternatives (bucketing, sampled metrics) are explored

### Requirement: Application-Level Metrics

Services SHALL define business metrics relevant to their domain alongside infrastructure metrics (e.g., orders placed, login attempts, feature adoption).

#### Scenario: Business metric instrumentation
- **WHEN** tracking business events
- **THEN** metrics are defined with appropriate labels (customer tier, feature flag, region)

#### Scenario: Feature adoption tracking
- **WHEN** a feature flag is used
- **THEN** metrics track which flag was activated and relative usage

### Requirement: Metric Aggregation Strategy

Services SHALL design metrics considering how they will be aggregated: rates calculated at query time, sums across services, and percentile calculations across instances.

#### Scenario: Rate calculation
- **WHEN** measuring request throughput
- **THEN** metrics use `_total` suffix to enable `rate()` calculation at query time

#### Scenario: Sum aggregation
- **WHEN** tracking error count across services
- **THEN** metrics include service/instance labels to enable cross-service summation

#### Scenario: Percentile calculation
- **WHEN** measuring latency
- **THEN** Histogram buckets are configured to enable accurate percentile calculations (p99, p95, etc.)

### Requirement: Metric Versioning and Evolution

Metrics SHALL maintain backward compatibility or use explicit versioning when semantics change. Deprecated metrics SHALL be documented with migration guidance.

#### Scenario: Metric deprecation
- **WHEN** retiring a metric
- **THEN** documentation includes deprecation notice and recommended replacement

#### Scenario: Metric semantic change
- **WHEN** metric semantics change (e.g., label added, definition clarified)
- **THEN** version number is incremented in metric name or clearly documented

### Requirement: SLO-Oriented Metrics

Services SHALL define metrics that directly support Service Level Objective (SLO) measurements: request rates, error rates, latency distributions.

#### Scenario: Request rate metric
- **WHEN** defining SLO goals
- **THEN** metrics are designed to support rate calculations (e.g., `requests_total` counter)

#### Scenario: Error rate metric
- **WHEN** tracking error rates for SLOs
- **THEN** error metrics are structured to enable error ratio calculation

#### Scenario: Latency SLO support
- **WHEN** defining latency SLOs (e.g., p99 < 100ms)
- **THEN** Histogram buckets are configured to support required percentile calculations

## REMOVED Requirements

None

