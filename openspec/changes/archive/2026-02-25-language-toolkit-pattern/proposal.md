---
td-board: language-toolkit-pattern
td-issue: td-ba5508
---

# Proposal: Language Toolkit Pattern

## Why

The platform has a Go `servicedefaults` package that wires all observability signals (traces, metrics, logs), HTTP client defaults, and env-aware behavior in a single `Configure()` call — analogous to .NET Aspire's `AddServiceDefaults()`. This pattern is entirely undocumented as a reusable platform standard: if the platform adds a Python or TypeScript service tomorrow, the same capability would be rebuilt from scratch with no canonical reference. This change formalises the pattern as a first-class architecture rule so every language runtime on the platform has a shared contract to implement against.

## What Changes

- Add `language-toolkits.md` to `.opencode/rules/patterns/architecture/` — a new pattern rule defining what a language toolkit is, what capabilities it MUST provide (logging, metrics, tracing, HTTP client defaults), how it is structured, and how it is tested
- Add `language-toolkits` to the canonical pattern registry in `.opencode/rules/patterns/README.md`
- Update `.opencode/rules/technologies/go/servicedefaults.md` to explicitly declare that the Go `servicedefaults` package is the platform's conforming implementation of the `language-toolkits` pattern
- Update the `observability-instrumentation` skill to reference the pattern rule as the authoritative source for what a toolkit must provide

## Capabilities

### New Capabilities

- `language-toolkit-pattern-rule`: the `language-toolkits.md` pattern rule document and its registration in the canonical pattern registry

### Modified Capabilities

- `go-toolkit-conformance`: update `servicedefaults.md` and the `observability-instrumentation` skill to declare conformance with the new pattern

## Impact

- Affected files: `.opencode/rules/patterns/README.md`, `.opencode/rules/patterns/architecture/language-toolkits.md` (new), `.opencode/rules/technologies/go/servicedefaults.md`, `.opencode/skills/observability-instrumentation/SKILL.md`
- API changes: none
- Data model changes: none
- Dependencies: none new — the Go `servicedefaults` package already exists at `src/staccato-toolkit/domain/pkg/servicedefaults/`
