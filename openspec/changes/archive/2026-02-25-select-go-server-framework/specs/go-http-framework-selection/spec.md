---
td-board: select-go-server-framework-go-http-framework-selection
td-issue: td-f3d976
---

# Specification: Go HTTP Framework Selection

## Overview

This specification defines the requirements for selecting, documenting, and adopting a Go HTTP server framework across the platform. The selection process evaluates candidates against weighted criteria (OTel integration 35%, routing 25%, stdlib compatibility 20%, ecosystem maturity 20%) and establishes usage patterns for all Go services.

## ADDED Requirements

### Requirement: Framework evaluation and selection

As a platform architect, I SHALL evaluate Go HTTP server frameworks (net/http stdlib, chi, gin, echo, huma) against defined criteria and select one standard framework so that all Go services use a consistent, well-reasoned approach.

**Evaluation criteria**:
- OTel middleware support / integration story (35% weight)
- Routing capabilities: path params, route groups, middleware composition (25% weight)
- Minimal dependencies / stdlib compatibility (20% weight)
- Ecosystem maturity and maintenance (20% weight)

**Deliverable**: Documented decision with rationale in design.md

#### Scenario: Chi selected as framework

- **WHEN** evaluation completes against weighted criteria
- **THEN** chi is selected for its stdlib compatibility (`http.Handler` everywhere), otelchi middleware availability, composable middleware, and minimal dependencies
- **AND** decision rationale is documented with comparison against other candidates

#### Scenario: Framework decision is traceable

- **WHEN** reviewing the framework selection
- **THEN** each candidate's score against each criterion is documented
- **AND** the decision rationale explains why the selected framework best serves platform needs

### Requirement: Staccato-server migration

As a platform engineer, I SHALL migrate staccato-server from stdlib net/http to the selected framework so that we have a reference implementation for other services.

**Migration scope**:
- Replace stdlib router with chi.NewRouter()
- Replace otelhttp.NewHandler() with otelchi middleware
- Maintain all existing routes and functionality
- Preserve current OTel instrumentation behavior

**Files affected**: `src/staccato-toolkit/server/main.go`

#### Scenario: Chi router replaces stdlib

- **WHEN** staccato-server is migrated
- **THEN** main.go uses `chi.NewRouter()` instead of `http.ServeMux`
- **AND** all existing routes are registered via chi's routing methods
- **AND** the server still listens on the same port with same behavior

#### Scenario: OTel middleware is maintained

- **WHEN** staccato-server is migrated to chi
- **THEN** otelchi middleware is configured on the router
- **AND** all HTTP requests continue to generate OTel spans
- **AND** span attributes match or improve upon the previous otelhttp implementation

### Requirement: Framework usage rule

As a platform engineer, I SHALL have a usage rule for the selected framework so that I know how to build new Go HTTP services consistently.

**Rule location**: `.opencode/rules/technologies/go/chi.md`

**Rule content**:
- When to use chi (all Go HTTP services)
- Router setup with OTel middleware
- Route registration patterns
- Middleware composition patterns
- Path parameter handling
- Route grouping for API versioning

#### Scenario: Usage rule provides router setup

- **WHEN** a platform engineer reads the chi usage rule
- **THEN** the rule includes a complete example of setting up chi.NewRouter() with otelchi middleware
- **AND** the example shows how to register routes with path parameters
- **AND** the example demonstrates route grouping for API prefixes

#### Scenario: Usage rule addresses common patterns

- **WHEN** a platform engineer needs to implement middleware
- **THEN** the chi usage rule documents middleware composition patterns
- **AND** the rule explains the order of middleware execution
- **AND** the rule provides examples of custom middleware creation

### Requirement: Framework decision documentation

As a platform architect, I SHALL document the framework decision in the design artifact so that future engineers understand the rationale and constraints.

**Documentation includes**:
- Selected framework (chi) and version
- Decision rationale with criteria weights
- Comparison table of all evaluated candidates
- Migration approach for existing services
- Technology adoption entry linking to usage rule

#### Scenario: Design documents decision rationale

- **WHEN** reviewing the design.md artifact
- **THEN** the decision section explains why chi was selected
- **AND** a comparison table shows how each candidate scored against criteria
- **AND** the rationale addresses why chi is preferred over gin/echo despite their popularity

#### Scenario: Technology adoption is tracked

- **WHEN** the framework decision is finalized
- **THEN** design.md includes a Technology Adoption table entry for chi
- **AND** the entry links to `.opencode/rules/technologies/go/chi.md`
- **AND** the usage rule is created or marked as a research task
