---
td-board: adopt-grafana-dashboarding-grafana-dashboard-design
td-issue: td-953f7f
---

# Specification: Grafana Dashboard Design Patterns

## Overview

This spec defines dashboard design patterns for consistent, unified visualization across logs, metrics, and traces. Dashboards SHALL follow naming conventions, layout standards, and multi-signal correlation patterns to enable operators to diagnose issues across all observability signals.

## ADDED Requirements

### Requirement: Dashboard Naming and Metadata Standards

The system SHALL require dashboards to follow naming conventions and include metadata. Dashboard titles SHALL use the pattern `<service>-<signal-type>-<purpose>` (e.g., `api-server-logs-errors`, `database-metrics-latency`). Dashboard descriptions SHALL document purpose, owning team, and runbook links.

#### Scenario: Dashboard with standard naming

- **WHEN** a new dashboard is created for service-auth to display error logs
- **THEN** it is named `service-auth-logs-errors` with a description that identifies it as an error investigation dashboard

#### Scenario: Dashboard metadata linked to runbooks

- **WHEN** a dashboard description is written
- **THEN** it includes links to relevant runbooks (e.g., "See runbook: /runbooks/auth-errors.md") for operator reference

### Requirement: Multi-Signal Correlation Layout

The system SHALL provide layout guidance for dashboards that correlate logs, metrics, and traces. A standard dashboard layout SHALL include top row (key metrics/RED), middle row (log streams), and bottom row (traces).

#### Scenario: Dashboard correlates metrics, logs, traces

- **WHEN** creating a dashboard for a service experiencing issues
- **THEN** the dashboard layout follows the pattern: metrics at top, logs in middle, traces at bottom for correlation flow

#### Scenario: Cross-signal drill-down links

- **WHEN** an operator clicks on a metric spike in a graph
- **THEN** they can drill down to related log entries and traces from the same time window

### Requirement: Panel Types and Visualizations

The system SHALL standardize panel types for common observability use cases. Metrics SHALL use graph panels with rate/duration aggregations, logs SHALL use table panels with filtering, traces SHALL use flame graphs or trace timeline panels.

#### Scenario: Metrics visualization with graph panels

- **WHEN** displaying request latency metrics
- **THEN** use a graph panel with lines, set Y-axis to milliseconds, and display 95th/99th percentiles alongside mean

#### Scenario: Logs visualization with table panels

- **WHEN** displaying application error logs
- **THEN** use a table panel with columns for timestamp, service, level, and message, with filtering and sorting enabled

#### Scenario: Traces visualization with flame graph

- **WHEN** displaying distributed traces for a service
- **THEN** use a flame graph panel that shows span duration and critical path

### Requirement: Dashboard Templating and Variables

The system SHALL support dashboard templating using Grafana variables. Dashboards SHALL expose variables for service name, environment, time range, and log level to enable operators to filter and re-use dashboards across services.

#### Scenario: Dashboard parameterized by service

- **WHEN** a dashboard is created with a `$service` variable
- **THEN** operators can change the service name and view data for different services without creating duplicate dashboards

#### Scenario: Environment-aware dashboards

- **WHEN** a dashboard includes `$environment` variable (dev/staging/prod)
- **THEN** operators can toggle between environments to compare behavior

### Requirement: Dashboard Color Scheme and Accessibility

The system SHALL follow consistent color schemes for visualization. Dashboards SHALL use Grafana's built-in color palettes (with preference for colorblind-safe themes) and SHALL avoid red/green only distinctions for alerts.

#### Scenario: Color scheme consistency

- **WHEN** multiple dashboards are viewed
- **THEN** metrics use consistent colors (e.g., blue for latency, green for throughput, red for errors)

#### Scenario: Alert color visibility

- **WHEN** an alert condition is visualized on a dashboard
- **THEN** the alert state uses a shape, icon, or label (not color alone) to indicate severity

## MODIFIED Requirements

(None - this is a new capability)

## REMOVED Requirements

(None - this is a new capability)
