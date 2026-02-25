---
td-board: language-toolkit-pattern
td-issue: td-ba5508
status: proposed
date: 2026-02-25
decision-makers:
  - platform-architect
component:
  - .opencode/rules/patterns/architecture
  - .opencode/rules/technologies/go
  - .opencode/skills/observability-instrumentation
tech-radar: []
---

# Design: Language Toolkit Pattern

## Context and problem statement

The platform has a Go `servicedefaults` package implementing a well-defined pattern (single-call init of all observability signals + HTTP client defaults), but this pattern exists only as an undocumented convention. No canonical contract defines what a "language toolkit" IS or what it MUST provide. If a Python or TypeScript service is added tomorrow, the same capability would be rebuilt from scratch with no reference to constrain the implementation.

The `language-toolkit-pattern` change formalises this as a first-class architecture rule, registers it in the canonical pattern registry, and back-fills conformance declarations into the Go implementation's usage rules and the observability skill.

## Goals / Non-Goals

**Goals:**
- Define a language-agnostic contract for language toolkits (what they MUST provide, how they are structured)
- Register the `language-toolkits` domain in the canonical pattern registry so rule-coverage audits detect it
- Declare explicit conformance in `servicedefaults.md` and `observability-instrumentation` skill

**Non-Goals:**
- Implement toolkits for Python, TypeScript, or any other language (deferred to future changes)
- Change any runtime behavior of the existing Go `servicedefaults` package
- Define deployment or CI/CD concerns for toolkits

## Decision: Structure of the pattern rule document

The `language-toolkits.md` pattern rule SHALL define a toolkit in four sections:

1. **What it is**: A language-runtime package providing unified, single-call initialisation of all platform cross-cutting concerns (observability, HTTP client defaults).
2. **Required capabilities** (MUST): logging, distributed tracing, metrics, HTTP client defaults — each with an explanation of what "fulfilling" the capability means.
3. **Structural contract**: single entry-point function accepting a service name string and returning a `(shutdown func, err)` pair; functional options for configuration overrides; `OTEL_SDK_DISABLED` no-op path.
4. **Conformance declaration**: the toolkit's technology usage-rules file MUST contain a `## Pattern Conformance` section mapping each required capability to the specific implementation mechanism.

**Rationale**: This structure is language-agnostic (the contract is behavioural, not syntactic), and the conformance-section requirement creates a mechanical audit trail — any future toolkit can be checked by reading its usage-rules file.

## Decision: Registry layer placement

The `language-toolkits` domain is added to **Layer 2: Architecture** in `README.md` — specifically after `boundaries` and before `api-design` — because it is primarily an abstraction/module concern (how platform cross-cutting concerns are packaged), not a code-quality or delivery concern.

**Trigger condition**: "Any change that introduces a new language runtime or service type on the platform."

## Decision: Conformance back-fill scope

Two files are updated:
- `servicedefaults.md`: add `## Pattern Conformance` section (no structural changes to existing content)
- `observability-instrumentation/SKILL.md`: add a Prerequisites link to `language-toolkits.md` and a note directing agents to the pattern rule when implementing observability for non-Go services

No other files require changes. The Go servicedefaults implementation itself is unchanged.

## Technology Adoption & Usage Rules

| Technology / Pattern | Action | Rule file |
|---|---|---|
| `language-toolkits` pattern | create | `.opencode/rules/patterns/architecture/language-toolkits.md` |

## Agent Skills

| Skill | Action | Notes |
|---|---|---|
| `observability-instrumentation` | update | Add pattern rule link to Prerequisites; note for non-Go services |

## Catalog Entities

| Entity | Kind | Action | Notes |
|---|---|---|---|
| n/a | — | — | No new catalog entities; this change adds documentation and rules only |
