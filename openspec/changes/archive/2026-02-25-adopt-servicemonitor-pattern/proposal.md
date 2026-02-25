---
td-board: adopt-servicemonitor-pattern
td-issue: td-8db7b0
---

# Proposal: ServiceMonitor Pattern Adoption

## Why

ServiceMonitor is an actively used pattern in our Kubernetes deployments for Prometheus auto-discovery, but it lacks formal documentation and standardized usage conventions. Teams are implementing ServiceMonitor configurations inconsistently (label selectors, scrape intervals, namespaces) with no documented best practices, leading to monitoring gaps and operational confusion. Documenting this pattern establishes a shared contract for metric collection, label strategies, and scrape configuration tuning.

## What Changes

- Define ServiceMonitor CRD usage pattern for Prometheus auto-discovery
- Document label selector conventions and namespace targeting strategies
- Establish scrape interval tuning guidelines and performance considerations
- Create enforceable usage rules for ServiceMonitor definitions

## Capabilities

### New Capabilities

- `servicemonitor-definition`: Define canonical ServiceMonitor structure, label requirements, and selector strategies
- `servicemonitor-scrape-config`: Document scrape interval tuning, metric path conventions, and timeout configuration
- `servicemonitor-label-conventions`: Establish label naming conventions and mutual exclusion patterns for label selectors

### Modified Capabilities

(None)

## Impact

- Affected services: All Kubernetes workloads exposing metrics for Prometheus collection
- API changes: None (uses existing Prometheus Operator ServiceMonitor CRD)
- Data model changes: None
- Dependencies: Prometheus Operator (already present), Kubernetes 1.20+
