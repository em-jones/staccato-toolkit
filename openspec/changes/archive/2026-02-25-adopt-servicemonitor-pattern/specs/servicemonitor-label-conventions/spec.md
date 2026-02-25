---
td-board: adopt-servicemonitor-pattern-servicemonitor-label-conventions
td-issue: td-f39833
---

# Specification: ServiceMonitor Label Conventions

## Overview

This spec establishes label naming conventions and mutual exclusion patterns for ServiceMonitor label selectors. Consistent labeling enables deterministic metric discovery and prevents accidental inclusion or exclusion of targets.

## ADDED Requirements

### Requirement: Service labels SHALL use app and version labels

Services targeted by ServiceMonitor MUST be labeled with `app` and `version` labels at minimum. These labels enable Prometheus to uniquely identify and group related services and their lifecycle versions.

#### Scenario: Service identified by app label
- **WHEN** service has label app=myservice
- **THEN** ServiceMonitor can select this service using matchLabels: {app: myservice}

#### Scenario: Version label enables deployment tracking
- **WHEN** service has labels app=myservice and version=v1.2.3
- **THEN** Prometheus can correlate metrics across different versions of the same service

### Requirement: matchLabels and matchExpressions are mutually exclusive per selector

A single labelSelector in ServiceMonitor MUST use either matchLabels OR matchExpressions, but not both. Combining them creates ambiguous selector semantics.

#### Scenario: matchLabels selector is exclusive
- **WHEN** selector specifies matchLabels: {app: myservice}
- **THEN** selector MUST NOT have matchExpressions field

#### Scenario: matchExpressions selector is exclusive
- **WHEN** selector specifies matchExpressions: [{key: environment, operator: In, values: [prod]}]
- **THEN** selector MUST NOT have matchLabels field

### Requirement: Label selector operators SHALL follow Kubernetes conventions

ServiceMonitor label selector operators (In, NotIn, Exists, DoesNotExist) MUST match Kubernetes label selector operator semantics. Custom operators are not supported.

#### Scenario: In operator matches multiple label values
- **WHEN** matchExpressions: [{key: tier, operator: In, values: [frontend, backend]}]
- **THEN** Prometheus selects services where tier is either frontend or backend

#### Scenario: Exists operator matches presence without value constraint
- **WHEN** matchExpressions: [{key: monitoring, operator: Exists}]
- **THEN** Prometheus selects services that have the monitoring label, regardless of value

### Requirement: namespaceSelector SHALL be explicitly specified

ServiceMonitor MUST include a namespaceSelector field that specifies which namespaces are valid targets. Implicit cluster-wide defaults are not allowed.

#### Scenario: Specific namespaces are targeted
- **WHEN** namespaceSelector: {matchNames: [production, staging]}
- **THEN** Prometheus discovers services only in production and staging namespaces

#### Scenario: Empty namespaceSelector targets all namespaces
- **WHEN** namespaceSelector: {} (empty object)
- **THEN** Prometheus discovers services in all namespaces, including kube-system

### Requirement: Label selectors SHOULD avoid catch-all patterns

Label selectors SHOULD NOT use catch-all patterns like empty matchLabels or existence-only selectors that could unintentionally include unrelated services. Explicit selectors reduce operational risk.

#### Scenario: Explicit selector prevents accidental inclusion
- **WHEN** selector uses matchLabels: {app: specific-service}
- **THEN** only services with exactly that label are discovered

#### Scenario: Catch-all selector risks unintended discovery
- **WHEN** matchExpressions: [{key: any-key, operator: Exists}]
- **THEN** all services with any-key label are discovered, regardless of value or purpose

### Requirement: Label names MUST follow DNS subdomain rules

Label names used in ServiceMonitor selectors MUST be valid Kubernetes label names: lowercase alphanumeric, hyphens, underscores, and dots, starting and ending with alphanumeric characters. Maximum 63 characters.

#### Scenario: Valid label name follows conventions
- **WHEN** label name is app.example.com/component
- **THEN** label name is accepted by Kubernetes and ServiceMonitor

#### Scenario: Invalid label name is rejected
- **WHEN** label name contains spaces or uppercase letters
- **THEN** label selector validation fails
