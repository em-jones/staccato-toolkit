---
td-board: adopt-grafana-dashboarding-grafana-dashboard-provisioning
td-issue: td-8c6977
---

# Specification: Grafana Dashboard Provisioning

## Overview

This spec defines how Grafana dashboards and datasources are provisioned as code using JSON models, versioning, and GitOps workflow. Dashboards SHALL be stored in version control with change tracking, imported via provisioning API, and synced across environments.

## ADDED Requirements

### Requirement: Dashboard JSON Model Version Control

The system SHALL maintain dashboard JSON models in version control with commit history and change tracking. Each dashboard JSON file SHALL be stored at `observability/dashboards/<dashboard-name>.json` with semantic versioning tracked via git tags.

#### Scenario: Dashboard stored in version control

- **WHEN** a new dashboard is created in Grafana
- **THEN** its JSON model is exported and committed to `observability/dashboards/` with a descriptive commit message

#### Scenario: Dashboard version tracking

- **WHEN** a dashboard is modified
- **THEN** changes are committed with an updated version in the dashboard JSON metadata (e.g., `"version": 2`)

### Requirement: Datasource Provisioning Configuration

The system SHALL define datasource provisioning configuration as code using YAML/JSON at `observability/provisioning/datasources/`. Datasource configurations SHALL include connection details, authentication, and TLS settings without embedding secrets.

#### Scenario: Datasource created from provisioning config

- **WHEN** Grafana starts with provisioning configuration
- **THEN** datasources (Prometheus, Loki, Tempo) are automatically registered with correct connection details

#### Scenario: Secrets injected at runtime

- **WHEN** Grafana reads datasource provisioning config
- **THEN** secrets (API keys, passwords) are injected from environment variables or secret store, not stored in config files

### Requirement: Dashboard Import and Sync Workflow

The system SHALL support importing dashboards from JSON files into Grafana via provisioning API. Dashboards SHALL be synced bidirectionally: from code (GitOps) and optionally exported back to code for review before committing.

#### Scenario: Dashboard imported from JSON

- **WHEN** dashboard JSON file is added to `observability/dashboards/` and sync job runs
- **THEN** Grafana imports the dashboard and makes it available for viewing

#### Scenario: Dashboard export for review

- **WHEN** dashboard is modified in Grafana UI and operator requests export
- **THEN** updated JSON is exported, diff is displayed, and operator can commit or discard changes

### Requirement: Dashboard Folder and Organization

The system SHALL organize dashboards into Grafana folders by service or domain. Folders SHALL be provisioned alongside dashboards and clearly labeled for navigation.

#### Scenario: Dashboards organized by service

- **WHEN** dashboards for service-a, service-b, and platform are provisioned
- **THEN** they appear in separate folders: `service-a-dashboards`, `service-b-dashboards`, `platform-dashboards`

#### Scenario: Dashboard accessibility and permissions

- **WHEN** a user views the dashboard list in Grafana
- **THEN** they see dashboards grouped by folder with appropriate visibility based on role

## MODIFIED Requirements

(None - this is a new capability)

## REMOVED Requirements

(None - this is a new capability)
