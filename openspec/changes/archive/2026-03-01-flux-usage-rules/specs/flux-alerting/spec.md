---
td-board: flux-usage-rules-alerting
td-issue: td-28dc33
---

# Specification: Flux Alerting (Alert & Provider)

## Overview

Defines rules for configuring Flux v2 notification alerts via `Alert` and `Provider` CRDs. Alerts notify engineers of reconciliation failures, health check failures, and upgrade issues. All alerting configuration SHALL live in the `staccato-manifests` repository under the `flux-system` path.

## ADDED Requirements

### Requirement: Alert Provider configuration for Slack and webhook

`Provider` resources SHALL be declared for each notification channel. Slack providers SHALL set `spec.type: slack` and reference a `secretRef` containing the Slack webhook URL. Generic webhook providers SHALL set `spec.type: generic` with the target URL in a Secret. Provider names SHALL follow the pattern `<channel>-<type>` (e.g., `alerts-slack`, `ops-webhook`).

#### Scenario: Slack provider declaration

- **WHEN** a Slack channel is configured as an alert target
- **THEN** a `Provider` of `spec.type: slack` SHALL be created in `flux-system` with `spec.secretRef.name` pointing to a Secret containing the webhook URL key `address`

#### Scenario: Webhook provider declaration

- **WHEN** a generic HTTP webhook is used for alerting
- **THEN** a `Provider` of `spec.type: generic` SHALL be created with the URL stored in a Secret (not inline in the manifest)

#### Scenario: Provider secret not exposed

- **WHEN** any `Provider` is configured
- **THEN** the webhook URL or token SHALL NOT appear in the `Provider` spec; it SHALL be referenced via `spec.secretRef`

### Requirement: Alert resource event severity filtering

`Alert` resources SHALL declare `spec.eventSeverity` to filter which events trigger notifications. The severity SHALL be `error` for production alerts (failures only) and `info` for development environments (all events). The `spec.eventSources` field MUST list the specific Kustomization or HelmRelease resources to monitor — wildcard catch-all sources are prohibited in production.

#### Scenario: Production alert severity

- **WHEN** an `Alert` targets a production environment
- **THEN** `spec.eventSeverity` SHALL be `error`

#### Scenario: Development alert severity

- **WHEN** an `Alert` targets a development or local environment
- **THEN** `spec.eventSeverity` MAY be `info` to surface all reconciliation events

#### Scenario: Explicit event sources

- **WHEN** an `Alert` is declared
- **THEN** `spec.eventSources` MUST list specific named resources (kind + name) — the name MUST NOT use `*` (wildcard) in production

### Requirement: Alert notification grouping and targeting

Each `Alert` SHALL target exactly one `Provider` via `spec.providerRef`. Multiple channels (e.g., Slack + PagerDuty) MUST be implemented as separate `Alert` resources pointing to separate `Provider` resources. An `Alert` SHALL not fan out to multiple providers inline.

#### Scenario: Single provider per Alert

- **WHEN** notifications need to go to multiple channels
- **THEN** a separate `Alert` resource SHALL be created for each `Provider`

#### Scenario: Alert naming

- **WHEN** an `Alert` is created
- **THEN** its name SHALL follow the pattern `<component>-<channel>` (e.g., `observability-slack`, `gitea-webhook`)

#### Scenario: Alert scoped to change events

- **WHEN** an `Alert` monitors a Kustomization
- **THEN** only events from that specific Kustomization SHALL be captured, not from all resources in the namespace

### Requirement: Alert resource scoping and namespace

`Alert` and `Provider` resources SHALL be placed in the `flux-system` namespace. They MAY reference resources in other namespaces via `spec.eventSources[].namespace`. A dedicated `Alert` SHALL be created to monitor the health of the `flux-system` Kustomizations themselves (self-monitoring).

#### Scenario: Alert and Provider in flux-system

- **WHEN** any `Alert` or `Provider` is declared
- **THEN** `metadata.namespace` SHALL be `flux-system`

#### Scenario: Cross-namespace event source

- **WHEN** an `Alert` monitors a `HelmRelease` in the `monitoring` namespace
- **THEN** `spec.eventSources[].namespace` SHALL be set to `monitoring`

#### Scenario: Self-monitoring alert

- **WHEN** the cluster is provisioned
- **THEN** at least one `Alert` SHALL monitor the core `flux-system` Kustomizations for failures
