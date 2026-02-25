---
td-board: adopt-go-app
td-issue: td-87b3e8
---

# Proposal: Adopt go-app v10

## Why

The staccato-web interface module uses go-app v10 for its WASM-based PWA. go-app is not yet formally adopted in the tech radar — this change records that adoption decision (at Trial ring) and documents the usage rules.

## What Changes

- go-app v10 (`github.com/maxence-charriere/go-app/v10`) added to tech radar at **Trial**
- Usage rules documented in `.opencode/rules/technologies/go.md` (go-app v10 section)

## Capabilities

### New Capabilities

- `go-app-adoption`: Adoption rationale, tech radar entry, and usage rules for go-app v10

### Modified Capabilities

*(none)*

## Impact

- Affected modules: `src/staccato-toolkit/web/`
- API changes: No
- Data model changes: No
- Dependencies: `github.com/maxence-charriere/go-app/v10 v10.1.11`
