---
td-board: select-go-server-framework
td-issue: td-c5c778
---

# Proposal: Select Go HTTP Server Framework

## Why

The platform currently uses Go stdlib `net/http` in staccato-server by implicit default, never formally evaluated. As we scale to more Go services, we need a consistent, well-reasoned framework choice that supports our observability requirements and minimal-dependency principles.

## What Changes

- Formal evaluation of Go HTTP server frameworks against weighted decision criteria
- Selection and documentation of standard framework for all Go services
- Migration of staccato-server to the selected framework
- Creation of usage rules for the selected framework

## Capabilities

### New Capabilities

- `go-http-framework-selection`: Evaluate candidates (net/http stdlib, chi, gin, echo, huma) against OTel integration, routing capabilities, stdlib compatibility, and ecosystem maturity. Select framework and establish usage patterns.

### Modified Capabilities

_None - this is a new architectural decision_

## Impact

- Affected services: `staccato-server` (immediate), all future Go HTTP services
- API changes: No external API changes, internal routing implementation only
- Data model changes: None
- Dependencies: May add lightweight routing library (chi likely candidate)
- Observability: Must maintain existing OTel instrumentation via middleware
