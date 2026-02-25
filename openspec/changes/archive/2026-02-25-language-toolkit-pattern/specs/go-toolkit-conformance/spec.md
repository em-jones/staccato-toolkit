---
td-board: language-toolkit-pattern-go-toolkit-conformance
td-issue: td-08bb0b
---

# Specification: Go Toolkit Conformance

## Overview

This spec defines requirements for updating `.opencode/rules/technologies/go/servicedefaults.md` and `.opencode/skills/observability-instrumentation/SKILL.md` to explicitly declare that the Go `servicedefaults` package is the platform's conforming implementation of the `language-toolkits` pattern.

## ADDED Requirements

### Requirement: servicedefaults.md declares pattern conformance

The platform SHALL add a `## Pattern Conformance` section to `.opencode/rules/technologies/go/servicedefaults.md` that explicitly states the `servicedefaults` package conforms to the `language-toolkits` pattern, listing which required capabilities are fulfilled by which package functions.

#### Scenario: Conformance section exists in servicedefaults.md

- **WHEN** an agent reads `.opencode/rules/technologies/go/servicedefaults.md`
- **THEN** a `## Pattern Conformance` section SHALL exist that references `.opencode/rules/patterns/architecture/language-toolkits.md`

#### Scenario: Conformance section maps capabilities to implementation

- **WHEN** a developer needs to verify Go toolkit compliance with the pattern
- **THEN** the conformance section SHALL map each required capability (logging, tracing, metrics, HTTP client) to the specific function or mechanism that fulfils it (`Configure()`, `NewHTTPClient()`, etc.)

### Requirement: observability-instrumentation skill references the pattern rule

The platform SHALL update `.opencode/skills/observability-instrumentation/SKILL.md` to reference `.opencode/rules/patterns/architecture/language-toolkits.md` as the authoritative source for what a language toolkit MUST provide, so that agents using the skill understand the canonical contract.

#### Scenario: Skill references pattern rule in prerequisites

- **WHEN** an agent loads the `observability-instrumentation` skill
- **THEN** the Prerequisites section SHALL include a link to `.opencode/rules/patterns/architecture/language-toolkits.md` with a note that it is the authoritative source for toolkit capability requirements

#### Scenario: Skill directs agents to pattern rule for new language runtimes

- **WHEN** an agent is implementing observability for a non-Go service
- **THEN** the skill SHALL direct the agent to the `language-toolkits` pattern rule as the starting point for understanding what to implement
