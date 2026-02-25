---
td-board: adopt-servicemonitor-pattern-servicemonitor-definition
td-issue: td-b3805e
---

# Specification: ServiceMonitor Definition

## Overview

This spec defines the canonical structure and requirements for ServiceMonitor resources used in Prometheus auto-discovery. It establishes the baseline structure that all services MUST follow when exposing metrics.

## ADDED Requirements

### Requirement: ServiceMonitor MUST have selector and namespace

A ServiceMonitor resource SHALL include a selector that matches the target service and a namespaceSelector that specifies which namespaces to scrape from. This ensures metrics are discovered consistently and targets the correct endpoints.

#### Scenario: ServiceMonitor matches service in target namespace
- **WHEN** a ServiceMonitor is created with label selectors matching the target service
- **THEN** Prometheus discovers and scrapes metrics from the matching service endpoints

#### Scenario: ServiceMonitor scope respects namespace boundaries
- **WHEN** namespaceSelector specifies particular namespaces
- **THEN** metrics are only collected from services in those namespaces, not cluster-wide

### Requirement: ServiceMonitor MUST define endpoints with port and path

Each ServiceMonitor SHALL specify endpoint configuration including the target port name and metric path. This enables Prometheus to scrape the correct metric endpoint and correctly identify the metrics.

#### Scenario: Prometheus scrapes correct port and path
- **WHEN** endpoint configuration specifies port and path
- **THEN** Prometheus scrapes metrics from the specified port and path, not alternate endpoints

#### Scenario: Multiple endpoints are supported
- **WHEN** ServiceMonitor specifies multiple endpoints
- **THEN** Prometheus scrapes all configured endpoints in sequence

### Requirement: ServiceMonitor MUST specify interval and timeout

Scrape interval and timeout values SHALL be explicitly configured per endpoint. This prevents default timeouts and ensures predictable metric collection behavior.

#### Scenario: Custom scrape interval is respected
- **WHEN** scrapeInterval is set on an endpoint
- **THEN** Prometheus uses that interval instead of global default

#### Scenario: Timeout prevents hanging scrapes
- **WHEN** timeout is set and target exceeds that duration
- **THEN** Prometheus cancels the scrape and records a timeout error

### Requirement: ServiceMonitor labels MUST be immutable after creation

Service label selectors defined in ServiceMonitor MUST be treated as stable. Changing labels on services or redefining selectors in ServiceMonitor after creation is not supported and requires recreating the resource.

#### Scenario: Service labels are stable for discovery
- **WHEN** ServiceMonitor is created with service label selectors
- **THEN** changes to service labels require ServiceMonitor recreation, not update

#### Scenario: Selector changes require recreation
- **WHEN** selector changes are needed on an existing ServiceMonitor
- **THEN** administrator must delete and recreate the resource, ensuring no scrape gap
