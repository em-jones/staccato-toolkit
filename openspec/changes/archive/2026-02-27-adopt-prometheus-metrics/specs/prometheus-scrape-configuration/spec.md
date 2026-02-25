---
td-board: adopt-prometheus-metrics-prometheus-scrape-configuration
td-issue: td-5fbdec
---

# Specification: Prometheus Scrape Configuration

## Overview

This spec defines how Prometheus discovers, scrapes, and stores metrics from services. It establishes patterns for service discovery, scrape interval configuration, relabeling rules, and metric retention.

## ADDED Requirements

### Requirement: Service Discovery Configuration

Services SHALL be discoverable by Prometheus through standardized mechanisms: DNS service discovery, Kubernetes service discovery, or static configuration files with automated updates.

#### Scenario: Kubernetes service discovery
- **WHEN** services run in Kubernetes
- **THEN** Prometheus uses Kubernetes API to discover services exposing `prometheus.io/scrape=true` annotation

#### Scenario: DNS-based discovery
- **WHEN** services use DNS naming conventions
- **THEN** Prometheus discovers services via DNS SRV records or configured DNS endpoints

#### Scenario: Static target configuration
- **WHEN** service topology is static
- **THEN** Prometheus uses static target lists updated via configuration management

### Requirement: Scrape Job Configuration

Each service or service type SHALL have a Prometheus scrape job configured with appropriate interval, timeout, and relabeling rules.

#### Scenario: Scrape interval configuration
- **WHEN** configuring a scrape job
- **THEN** scrape interval is set based on metric freshness requirements (typically 15-60 seconds)

#### Scenario: Scrape timeout setting
- **WHEN** a service may be slow to respond
- **THEN** scrape timeout is set shorter than scrape interval to allow retries

#### Scenario: Relabeling for service metadata
- **WHEN** discovering services
- **THEN** relabeling rules are applied to populate service, environment, and region labels

### Requirement: Metrics Endpoint Discovery

Prometheus SHALL discover metrics endpoints at a standard location: `/metrics` on port 9090 (or service-defined ports via annotations/labels).

#### Scenario: Default metrics port
- **WHEN** a service exposes metrics
- **THEN** it exposes them on a standard port or configurable via service discovery metadata

#### Scenario: Custom metrics path
- **WHEN** a service exposes metrics at a non-standard path
- **THEN** the path is discoverable via service annotations (e.g., `prometheus.io/path=/internal/metrics`)

#### Scenario: Authentication for metrics access
- **WHEN** metrics endpoint requires authentication
- **THEN** Prometheus is configured with appropriate auth headers or mTLS certificates

### Requirement: Metric Relabeling and Filtering

Prometheus SHALL apply relabeling rules to add/remove/modify metric labels based on discovered metadata, enabling consistent label naming across diverse services.

#### Scenario: Adding service label
- **WHEN** metrics are scraped from a service
- **THEN** relabeling rules add a `service` label from discovered metadata

#### Scenario: Dropping internal metrics
- **WHEN** a service exposes metrics not useful for monitoring
- **THEN** relabeling rules drop metrics matching patterns (e.g., `go_*` internal metrics)

#### Scenario: Normalizing label values
- **WHEN** services use inconsistent environment names
- **THEN** relabeling rules normalize values (e.g., `prod` → `production`)

### Requirement: Scrape Duration and Load Management

Prometheus configuration SHALL manage scrape duration and load: setting targets per scrape job, staggering scrapes, and avoiding excessive memory usage.

#### Scenario: Target limit per job
- **WHEN** configuring a scrape job with many targets
- **THEN** targets are batched to avoid excessive memory usage (typically 500-1000 targets per job)

#### Scenario: Scrape duration budgeting
- **WHEN** calculating total Prometheus load
- **THEN** total scrape duration (targets × timeout) is budgeted to fit within scrape interval

#### Scenario: Sample rate limiting
- **WHEN** a service exposes excessive metrics
- **THEN** metric relabeling or service instrumentation is adjusted to stay within cardinality budgets

### Requirement: Metric Retention and Storage

Prometheus storage SHALL be configured with appropriate retention periods, storage size limits, and compaction strategies based on monitoring requirements.

#### Scenario: Retention period configuration
- **WHEN** setting up Prometheus
- **THEN** retention period is configured (typically 15 days) based on alerting and analysis needs

#### Scenario: Storage space allocation
- **WHEN** sizing Prometheus infrastructure
- **THEN** disk space is allocated based on metric cardinality and retention period

#### Scenario: Remote storage integration
- **WHEN** long-term metric storage is needed
- **THEN** remote storage (e.g., S3, cortex) is configured for metrics exceeding local retention

### Requirement: Service Monitoring SLA

Services exposing metrics SHALL meet Service Level Objectives for metrics availability: scrape success rate, metric availability, and latency.

#### Scenario: Scrape success rate SLO
- **WHEN** defining monitoring SLOs
- **THEN** services target ≥99% scrape success rate

#### Scenario: Metrics endpoint latency SLO
- **WHEN** measuring metrics endpoint performance
- **THEN** `/metrics` endpoint responds within scrape timeout

## REMOVED Requirements

None

