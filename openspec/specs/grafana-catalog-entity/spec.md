# Specification: Grafana Catalog Entity

## Overview

This spec defines how Grafana dashboards are registered in the Backstage software catalog as observable components. Each dashboard SHALL have a corresponding catalog entity with metadata, ownership, and linkage to services and runbooks.

## Requirements
### Requirement: Dashboard Catalog Entity Definition

The system SHALL define dashboard entities in the Backstage software catalog using the kind `Dashboard` with metadata including name, title, description, owner team, and Grafana URL.

#### Scenario: Dashboard registered in catalog

- **WHEN** a new dashboard is created for service-auth
- **THEN** a catalog entity is created with kind=Dashboard, name=service-auth-dashboard, owner=auth-team, and link to Grafana URL

#### Scenario: Catalog entity metadata populated

- **WHEN** a dashboard entity is created
- **THEN** it includes title, description, service owner, labels (e.g., "observability", "critical"), and links to Grafana and related runbooks

### Requirement: Service-to-Dashboard Relationships

The system SHALL enable relationships between service catalog entities and dashboard entities. A service entity SHALL list its dashboards; a dashboard SHALL reference the service(s) it observes.

#### Scenario: Service lists related dashboards

- **WHEN** viewing a service in the Backstage catalog
- **THEN** the service page displays links to all dashboards that observe that service (errors, latency, resources)

#### Scenario: Dashboard shows observed services

- **WHEN** viewing a dashboard entity in the catalog
- **THEN** it lists the services being monitored and links to their service catalog pages

### Requirement: Dashboard Ownership and Teams

The system SHALL define dashboard ownership at the catalog level. Each dashboard SHALL have an explicit owner team (or person) responsible for maintenance and accuracy.

#### Scenario: Dashboard owner assigned

- **WHEN** a dashboard is created
- **THEN** it has an assigned owner team (e.g., platform-observability-team, auth-service-team) recorded in the catalog

#### Scenario: Ownership visible in Grafana and Backstage

- **WHEN** viewing a dashboard in Grafana or Backstage
- **THEN** the owner team is displayed with contact information (e.g., Slack channel, email)

### Requirement: Dashboard Lifecycle and Deprecation

The system SHALL track dashboard lifecycle (active, deprecated, archived) in the catalog. Deprecated dashboards SHALL be marked with reason and recommended replacement. Archived dashboards SHALL be retained for historical reference.

#### Scenario: Dashboard marked as deprecated

- **WHEN** a dashboard is superseded by a newer version
- **THEN** the old dashboard is marked as deprecated in the catalog with a note: "Use service-auth-logs-v2 instead"

#### Scenario: Dashboard archival with historical access

- **WHEN** a dashboard is archived
- **THEN** it is moved to an archive folder in Grafana, marked as archived in the catalog, but remains queryable for historical comparison

### Requirement: Dashboard Tagging and Categorization

The system SHALL support tagging dashboards for discovery. Tags SHALL include observability signal type (logs, metrics, traces), service domain, and criticality level.

#### Scenario: Dashboard discoverable by tags

- **WHEN** a dashboard has tags [logs, auth-service, critical]
- **THEN** operators can filter the catalog to find all critical dashboards or all auth-service dashboards

#### Scenario: Dashboard signal classification

- **WHEN** searching for "logs" dashboards
- **THEN** all dashboards with the logs tag are returned, enabling operators to find log-based views

## MODIFIED Requirements

(None - this is a new capability)

