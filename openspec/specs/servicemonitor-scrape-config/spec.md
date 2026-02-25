# Specification: ServiceMonitor Scrape Configuration

## Overview

This spec defines scrape interval tuning, metric endpoint paths, and timeout configurations for ServiceMonitor resources. It ensures consistent and predictable metric collection behavior across the cluster.

## Requirements
### Requirement: Default scrape interval SHALL be 30 seconds

ServiceMonitor endpoints without explicit scrapeInterval configuration SHALL use a 30-second interval as the baseline. This provides a reasonable default for most observability use cases without overwhelming Prometheus with requests.

#### Scenario: Default interval applies when not specified
- **WHEN** ServiceMonitor endpoint omits scrapeInterval
- **THEN** Prometheus uses 30 seconds as the scrape interval

#### Scenario: Custom interval overrides default
- **WHEN** scrapeInterval is explicitly set to a different value
- **THEN** Prometheus uses the specified interval instead of 30 seconds

### Requirement: Scrape timeout SHALL NOT exceed scrape interval

The scrapeTimeout value MUST be less than or equal to the scrapeInterval. A timeout exceeding the interval creates undefined behavior where scrapes may still be in flight when the next scrape is due.

#### Scenario: Timeout validation prevents misconfiguration
- **WHEN** timeout is configured greater than interval
- **THEN** ServiceMonitor fails validation or warning is emitted

#### Scenario: Timeout shorter than interval completes cleanly
- **WHEN** timeout is set to 5 seconds and interval is 30 seconds
- **THEN** Prometheus cancels requests after 5 seconds, allowing 25 seconds until next scrape

### Requirement: Metric path SHALL default to /metrics

ServiceMonitor endpoints without explicit path configuration SHALL scrape from /metrics. This reflects the standard Prometheus client library convention.

#### Scenario: Standard metrics endpoint is scraped
- **WHEN** path is not specified
- **THEN** Prometheus scrapes from /metrics on the target

#### Scenario: Custom path is honored
- **WHEN** path is set to /custom-metrics
- **THEN** Prometheus scrapes from /custom-metrics instead of /metrics

### Requirement: Port name MUST match service port definition

The port specified in ServiceMonitor endpoint configuration MUST correspond to a port name defined in the underlying service. Prometheus will fail to scrape if the port name does not exist.

#### Scenario: Port name resolves to service port
- **WHEN** endpoint specifies port: "metrics"
- **THEN** Prometheus looks up the "metrics" port in the service and scrapes that endpoint

#### Scenario: Invalid port name prevents scraping
- **WHEN** endpoint specifies port: "invalid-port"
- **THEN** Prometheus cannot scrape and records an error

### Requirement: High-cardinality metrics SHOULD use longer scrape intervals

Endpoints collecting high-cardinality metrics (unbounded label dimensions) SHOULD configure longer scrapeInterval values to reduce storage load. Recommended minimum is 60 seconds for high-cardinality endpoints.

#### Scenario: High-cardinality metrics use extended intervals
- **WHEN** endpoint exposes high-cardinality metrics and sets scrapeInterval: 60s
- **THEN** Prometheus reduces frequency, decreasing storage cost

#### Scenario: Low-cardinality endpoints use shorter intervals
- **WHEN** endpoint exposes only low-cardinality metrics
- **THEN** 30-second interval is appropriate
