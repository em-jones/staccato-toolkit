---
td-board: language-toolkit-pattern-language-toolkit-pattern-rule
td-issue: td-3ddab4
---

# Specification: Language Toolkit Pattern Rule

## Overview

This spec defines requirements for the `language-toolkits` architecture pattern rule — a new document in `.opencode/rules/patterns/architecture/` that formalises the contract every language-runtime toolkit MUST fulfil, and its registration in the canonical pattern registry.

## ADDED Requirements

### Requirement: Pattern rule document defines the language toolkit contract

The platform SHALL have a `language-toolkits.md` architecture pattern rule in `.opencode/rules/patterns/architecture/` that defines:
- What a language toolkit IS (a language-runtime package providing unified, single-call initialisation of all platform cross-cutting concerns)
- The MUST-provide capabilities: structured logging, distributed tracing, metrics, HTTP client defaults
- How a toolkit SHALL be structured (single entry-point function, functional options, graceful shutdown)
- How it SHALL be tested (unit tests covering the no-op/disabled path, integration tests exercising each signal)
- How conformance is declared (the toolkit's usage-rules file MUST include a `## Pattern Conformance` section)

#### Scenario: Rule document exists at the correct path

- **WHEN** a developer searches for language toolkit guidance
- **THEN** `.opencode/rules/patterns/architecture/language-toolkits.md` SHALL exist and be readable

#### Scenario: Rule document enumerates required capabilities

- **WHEN** a new language runtime is being added to the platform
- **THEN** the rule document SHALL enumerate all four required capabilities: logging, tracing, metrics, HTTP client defaults

#### Scenario: Rule document specifies the entry-point contract

- **WHEN** a developer authors a toolkit for a new language
- **THEN** the rule SHALL specify that the toolkit MUST expose a single initialisation entry point that accepts a service name and returns a shutdown function

#### Scenario: Rule document specifies the disabled/no-op path

- **WHEN** a toolkit is initialised with `OTEL_SDK_DISABLED=true`
- **THEN** the rule SHALL specify that the toolkit MUST return a no-op shutdown function without initialising any OTel providers

### Requirement: Pattern registry entry added for language-toolkits domain

The platform SHALL add a `language-toolkits` entry to `.opencode/rules/patterns/README.md` under Layer 2 (Architecture), so that the rule-coverage audit can detect and reference it.

#### Scenario: Registry entry triggers on new language runtime addition

- **WHEN** a change introduces a new language runtime or service type
- **THEN** the `language-toolkits` entry in `README.md` SHALL appear as a relevant domain during the rule-coverage audit (trigger condition satisfied)

#### Scenario: Registry entry points to correct rule file

- **WHEN** an agent reads the registry entry for `language-toolkits`
- **THEN** the entry SHALL specify `rule file: patterns/architecture/language-toolkits.md`

#### Scenario: Coverage Status table updated

- **WHEN** the change is complete
- **THEN** the `## Coverage Status` table in `README.md` SHALL include `language-toolkits — patterns/architecture/language-toolkits.md — ✓ exists`
