---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Pattern Rules: Canonical Domain Registry

This document is the **authoritative reference** for which pattern domains
require rule files in this platform. It is used by the `openspec-continue-change`
and `openspec-ff-change` skills during the rule-coverage audit in the specs and design phases.

## How to Use This Document

**During specs phase**: after creating requirement tasks for a capability, identify which pattern domains below are relevant to that capability (use the _trigger condition_). For each relevant domain, check whether its rule file exists. If missing, create a research task.
**During design phase**: after writing `design.md`, review the Technology Adoption table and pattern decisions. For each technology or decision, identify implied pattern domains. Check for gaps not caught in the specs phase.
**When authoring a missing rule**: find the domain entry below, read the trigger condition and source literature, then follow the [TEMPLATE.md](../TEMPLATE.md). Write the rule file to the path shown.

---

## Rule Selection Decision Guide

Use this decision tree during the specs-phase rule-coverage audit. For each capability, work through each question in order:

### Always apply (every capability)

- `code/naming` — any new code
- `code/testing` — any new capability
- `architecture/repository-layout` — any new source directory or service

### Apply if the capability…

| Condition                                                   | Domains to check                                |
| ----------------------------------------------------------- | ----------------------------------------------- |
| Introduces new functions or methods                         | `code/functions`, `code/solid`, `code/comments` |
| Can fail, handles user input, or crosses a service boundary | `code/error-handling`                           |
| Uses data transformation pipelines or shared state          | `code/functional-design`                        |
| Introduces a new module, layer, or external dependency      | `architecture/boundaries`                       |
| Introduces a new language runtime or service type           | `architecture/language-toolkits`                |
| Exposes or consumes HTTP or gRPC                            | `architecture/api-design`                       |
| Introduces or modifies persistent data structures           | `architecture/data-modeling`                    |
| Uses queues, event buses, pub/sub, or async workflows       | `architecture/async-messaging`                  |
| Provisions, modifies, or tears down infrastructure          | `delivery/iac`                                  |
| Introduces or modifies a build/deploy pipeline              | `delivery/ci-cd`                                |
| Deploys across multiple environments                        | `delivery/environments`                         |
| Runs in production or needs operational visibility          | `delivery/observability`                        |
| Uses feature flags for progressive delivery                 | `delivery/feature-flags`                        |
| Introduces a technology not yet covered by quality tooling  | `delivery/quality-tooling`                      |
| Handles auth, sensitive data, or external input             | `operations/security`                           |
| Makes remote calls or depends on external services          | `operations/reliability`                        |
| Has latency requirements or high-throughput processing      | `operations/performance`                        |
| Provisions cloud resources or runs recurring workloads      | `operations/cost`                               |

### De-duplication rule

If the same domain is triggered by multiple capabilities in the same change, create the research task **once** and wire `td dep add` from all affected requirement tasks to that single research task.

---

## Layer 1: Code

_Source literature: **Clean Code** (Martin), **Clean Architecture** (Martin), **Grokking Simplicity** (Normand)_

| Domain              | Description                                                  | Trigger                                                    | Rule File                            | Sources                                       |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------ | --------------------------------------------- |
| `naming`            | Naming identifiers: vars, functions, classes, modules        | Any new code — always                                      | `patterns/code/naming.md`            | Clean Code Ch. 2                              |
| `functions`         | Function size, SRP, argument count, side-effects             | Functions/methods                                          | `patterns/code/functions.md`         | Clean Code Ch. 3; Grokking Simplicity Ch. 1–6 |
| `error-handling`    | Error taxonomy, propagation, fail-fast                       | Can fail, handles input, crosses boundaries                | `patterns/code/error-handling.md`    | Clean Code Ch. 7; Architecture Ch. 20         |
| `testing`           | Unit test structure (AAA), coverage                          | Every capability (always)                                  | `patterns/code/testing.md`           | Clean Code Ch. 9; Growing OO Software         |
| `solid`             | SOLID principles: SRP, OCP, LSP, ISP, DIP                    | New classes, modules, abstractions                         | `patterns/code/solid.md`             | Clean Architecture Ch. 7–11                   |
| `functional-design` | Actions/Calculations/Data, pure functions, stratified design | State management, data pipelines, utilities                | `patterns/code/functional-design.md` | Grokking Simplicity Ch. 1–9, 13–15            |
| `comments`          | Doc-blocks, inline examples, side-effect diagrams            | Any exported/public symbol; any function with side effects | `patterns/code/comments.md`          | Clean Code Ch. 4                              |

---

## Layer 2: Architecture

_Source literature: **Clean Architecture** (Martin), **Enterprise Integration Patterns** (Hohpe & Woolf)_

| Domain              | Description                                              | Trigger                                | Rule File                                    | Sources                                                           |
| ------------------- | -------------------------------------------------------- | -------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| `repository-layout` | Filesystem layout: `src/`, component dirs, naming, depth | New source code, service, or tech      | `patterns/architecture/repository-layout.md` | Conway's Law; Clean Architecture Ch. 15–16                        |
| `boundaries`        | Dependency rule, layer separation, plugin architecture   | New layer, module, external dependency | `patterns/architecture/boundaries.md`        | Clean Architecture Ch. 5, 17–22                                   |
| `language-toolkits` | Unified logging, tracing, metrics, HTTP client init      | New language runtime or service type   | `patterns/architecture/language-toolkits.md` | Aspire, OpenTelemetry, Clean Architecture Ch. 17–22               |
| `api-design`        | REST/gRPC contract, versioning, request/response, errors | HTTP/gRPC interface                    | `patterns/architecture/api-design.md`        | Clean Architecture Ch. 22; REST dissertation; API Design Patterns |
| `data-modeling`     | Schema, migration, versioning, nullability, indexing     | Persistent data structures             | `patterns/architecture/data-modeling.md`     | Clean Architecture Ch. 12; Database Refactoring                   |
| `async-messaging`   | Message channels, routing, idempotency, dead-letter      | Queues, event buses, pub/sub           | `patterns/architecture/async-messaging.md`   | EIP Ch. 3–10; Designing Data-Intensive Ch. 11                     |

---

## Layer 3: Delivery

_Source literature: **Continuous Delivery** (Humble & Farley), **Infrastructure as Code** (Morris)_

| Domain            | Description                                                            | Trigger                                  | Rule File                              | Sources                                                      |
| ----------------- | ---------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `iac`             | Rendered manifests (render-then-apply), modules, state, drift, testing | Infrastructure provisioning/modification | `patterns/delivery/iac.md`             | CD Ch. 11; Terraform/Helm/Kustomize/CDK workflows; IaC Ch. 4 |
| `ci-cd`           | Pipeline conventions, artifact versioning, stages, rollback            | Build/deploy pipeline changes            | `patterns/delivery/ci-cd.md`           | Continuous Delivery Ch. 5, 13                                |
| `environments`    | Environment parity, config, secrets, promotion                         | Multi-environment deployment             | `patterns/delivery/environments.md`    | Continuous Delivery Ch. 11                                   |
| `observability`   | Structured logging, tracing, metrics, alerts                           | Production visibility or needs           | `patterns/delivery/observability.md`   | CD Ch. 8; Observability Engineering                          |
| `feature-flags`   | Flag lifecycle, types, rollout strategy                                | Progressive delivery or A/B testing      | `patterns/delivery/feature-flags.md`   | CD Ch. 14; Release It! Ch. 9                                 |
| `quality-tooling` | Audit for linting, formatting, testing per tech                        | New tech/runtime without tooling         | `patterns/delivery/quality-tooling.md` | AWS Well-Architected; CD Ch. 3; Clean Code                   |

---

## Layer 4: Operations

_Source literature: **AWS Well-Architected Framework** (six pillars)_

| Domain        | Description                                                 | Trigger                                | Rule File                            | Sources                                    |
| ------------- | ----------------------------------------------------------- | -------------------------------------- | ------------------------------------ | ------------------------------------------ |
| `security`    | IAM, secrets, least-privilege, threat modelling, validation | Auth, secrets, external input          | `patterns/operations/security.md`    | AWS WAF: Security; Web Hacker's Handbook   |
| `reliability` | Retry, circuit breakers, backoff, degradation, bulkheads    | Remote calls, external deps, SLAs      | `patterns/operations/reliability.md` | AWS WAF: Reliability; Release It! Ch. 4–5  |
| `performance` | Caching, batching, profiling, sizing, latency budgets       | Latency requirements, high-throughput  | `patterns/operations/performance.md` | AWS WAF: Performance; Data-Intensive Ch. 1 |
| `cost`        | Lifecycle, rightsizing, cleanup, attribution                | Cloud resources or recurring workloads | `patterns/operations/cost.md`        | AWS WAF: Cost Optimization                 |

---

## Coverage Status

Current status of rule files in this registry (auto-auditable by walking `.opencode/rules/patterns/`):

- `naming` — `patterns/code/naming.md` — ✓ exists
- `functions` — `patterns/code/functions.md` — ✓ exists
- `error-handling` — `patterns/code/error-handling.md` — ✓ exists
- `testing` — `patterns/code/testing.md` — ✓ exists
- `solid` — `patterns/code/solid.md` — ✓ exists
- `functional-design` — `patterns/code/functional-design.md` — ✓ exists
- `comments` — `patterns/code/comments.md` — ✓ exists
- `repository-layout` — `patterns/architecture/repository-layout.md` — ✓ exists
- `boundaries` — `patterns/architecture/boundaries.md` — ✓ exists
- `language-toolkits` — `patterns/architecture/language-toolkits.md` — ✓ exists
- `api-design` — `patterns/architecture/api-design.md` — ✓ exists
- `data-modeling` — `patterns/architecture/data-modeling.md` — ✓ exists
- `async-messaging` — `patterns/architecture/async-messaging.md` — ✓ exists
- `iac` — `patterns/delivery/iac.md` — ✓ exists
- `ci-cd` — `patterns/delivery/ci-cd.md` — ✓ exists
- `environments` — `patterns/delivery/environments.md` — ✓ exists
- `observability` — `patterns/delivery/observability.md` — ✓ exists
- `feature-flags` — `patterns/delivery/feature-flags.md` — ✓ exists
- `quality-tooling` — `patterns/delivery/quality-tooling.md` — ✓ exists
- `security` — `patterns/operations/security.md` — ✓ exists
- `reliability` — `patterns/operations/reliability.md` — ✓ exists
- `performance` — `patterns/operations/performance.md` — ✓ exists
- `cost` — `patterns/operations/cost.md` — ✓ exists

> **Note**: The Coverage Status table is a point-in-time snapshot. The authoritative check is always a filesystem walk of `.opencode/rules/patterns/` against the domain entries above. Update this table when rules are created as part of a change.

---

## Adding New Pattern Domains

When a design decision involves a pattern domain not listed above:

1. Add a new entry under the appropriate layer section
2. Follow the same table structure: description, trigger, rule file path, sources
3. Update the Coverage Status table
4. Record the addition in the change's `design.md` Technology Adoption table
5. Commit the updated README as part of the change that introduces it

## Deprecating Pattern Domains

When a pattern is superseded:

1. Add `**DEPRECATED**` to the entry with reason and date
2. Link to the replacement domain if one exists
3. Update the Coverage Status table to mark as deprecated
4. The rule file remains; mark it deprecated per the rules README convention
