---
td-board: adopt-tempo-tracing
td-issue: td-37efa7
---

# Proposal: Adopt Tempo for Distributed Tracing

## Why

Tempo has been adopted as the distributed tracing backend but lacks documented usage rules and a catalog entity. Teams need clear guidance on trace instrumentation patterns, sampling strategies, and OTel integration to ensure consistent, efficient tracing across the platform.

## What Changes

- Document trace sampling strategy and retention policies
- Establish usage rules for OpenTelemetry span instrumentation and trace correlation
- Create catalog entity for Tempo backend configuration and deployment
- Define observability platform tracing patterns (instrumentation, context propagation, trace cardinality management)

## Capabilities

### New Capabilities

- `span-instrumentation`: Usage rules for instrumenting spans with attributes, events, and semantic conventions
- `trace-context-propagation`: Patterns for trace context correlation across service boundaries and async operations
- `trace-sampling-strategy`: Configuration and usage rules for adaptive sampling, probabilistic sampling, and tail-based sampling
- `tempo-backend-config`: Configuration, deployment, and operation of Tempo backend; retention policies and performance tuning

### Modified Capabilities

- `observability-platform`: Enhancement to include tracing layer adoption and usage rules

## Impact

- Affected services/modules: All services in the platform requiring tracing instrumentation
- API changes: No breaking changes; adds documentation and usage constraints
- Data model changes: Introduces structured trace attribute schemas and semantic conventions
- Dependencies: OpenTelemetry Go SDK (already available), Tempo backend (already deployed)
