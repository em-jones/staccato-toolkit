---
td-board: enhance-design-spec-skills-with-rules-canonical-pattern-rules
td-issue: td-2001b8
---

# Specification: canonical-pattern-rules

## Overview

Defines the canonical document at `.opencode/rules/patterns/README.md` that lists every pattern domain for which a rule file must exist before dependent implementation tasks begin. This document is the reference used by skills during the rule-coverage audit in the specs and design phases.

## ADDED Requirements

### Requirement: Canonical patterns document exists - td-446a0d

The platform SHALL maintain a document at `.opencode/rules/patterns/README.md` that serves as the authoritative registry of pattern domains requiring rule files, organised by layer.

#### Scenario: Document is present and structured by layer

- **WHEN** an agent walks `.opencode/rules/patterns/README.md`
- **THEN** the document contains four top-level sections: `code`, `architecture`, `delivery`, and `operations`
- **THEN** each section lists its pattern domains with kebab-case identifiers matching their expected rule file paths

#### Scenario: Document is absent

- **WHEN** the file does not exist at `.opencode/rules/patterns/README.md`
- **THEN** the rule-coverage audit in the specs and design phases MUST fail with a clear message directing the architect to create it

### Requirement: Each pattern domain entry includes trigger condition and source literature - td-ff540d

Each pattern domain entry in the canonical document SHALL include: a one-line description, a trigger condition (when a capability requires this rule), the expected rule file path, and one or more source literature references to consult when authoring the rule.

#### Scenario: Agent uses entry to author a missing rule

- **WHEN** a research task directs a worker to create a missing rule file
- **THEN** the worker can open the canonical document, find the relevant entry, and determine what to write and what to read without additional guidance

#### Scenario: Entry is incomplete

- **WHEN** an entry is missing its trigger condition or source literature
- **THEN** a worker picking up the research task has insufficient context to author the rule correctly

### Requirement: Pattern domains cover all four layers - td-c3f430

The canonical document SHALL include at minimum the following pattern domains, drawn from the specified source literature:

**code layer** (Clean Code, Clean Architecture — Robert C. Martin):
- `naming` — identifier naming conventions
- `functions` — function size, single responsibility, argument discipline
- `error-handling` — error taxonomy, structured errors, fail-fast
- `testing` — unit test structure, coverage expectations, test doubles
- `solid` — SOLID principles applied to platform code

**architecture layer** (Clean Architecture, Enterprise Integration Patterns — Hohpe & Woolf):
- `boundaries` — dependency rule, layer separation, plugin architecture
- `api-design` — REST/gRPC contract conventions, versioning, error responses
- `data-modeling` — schema conventions, migrations, versioning
- `async-messaging` — message channels, routing, transformation, idempotency

**delivery layer** (Continuous Delivery — Humble & Farley):
- `ci-cd` — pipeline conventions, artifact versioning, environment promotion
- `environments` — config management, secrets, environment parity
- `observability` — structured logging, distributed tracing, metrics naming
- `feature-flags` — flag lifecycle, rollout strategy, cleanup

**operations layer** (AWS Well-Architected Framework — six pillars):
- `security` — IAM conventions, secrets handling, least-privilege, threat modelling
- `reliability` — retries, circuit breakers, exponential backoff, graceful degradation
- `performance` — caching strategy, batching, profiling, resource sizing
- `cost` — resource lifecycle, rightsizing, cleanup automation

#### Scenario: Audit finds a capability touching api-design

- **WHEN** a capability's design decisions include exposing or consuming an HTTP API
- **THEN** the audit identifies `architecture/api-design` as a required pattern domain
- **THEN** the audit checks whether `.opencode/rules/patterns/architecture/api-design.md` exists
- **THEN** if absent, a research task is created referencing the canonical entry

#### Scenario: New pattern domain is needed beyond the canonical list

- **WHEN** a design decision involves a pattern domain not in the canonical list
- **THEN** the architect MAY add a new entry to the canonical document as part of the change
- **THEN** the new entry MUST follow the same structure (description, trigger, path, sources)
