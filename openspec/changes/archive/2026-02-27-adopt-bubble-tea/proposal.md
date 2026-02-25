---
td-board: adopt-bubble-tea
td-issue: td-4971b0
---

# Proposal: Adopt Bubble Tea v2

## Why

The staccato-tui interface module uses Bubble Tea v2 for its terminal UI. Bubble Tea is not yet formally adopted in the tech radar — this change records that adoption decision and documents the usage rules.

## What Changes

- Bubble Tea v2 (`charm.land/bubbletea/v2`) added to tech radar at **Adopt**
- Usage rules documented in `.opencode/rules/technologies/go.md` (Bubble Tea v2 section)

## Capabilities

### New Capabilities

- `bubble-tea-adoption`: Adoption rationale, tech radar entry, and usage rules for Bubble Tea v2

### Modified Capabilities

*(none)*

## Impact

- Affected modules: `src/staccato-toolkit/tui/`
- API changes: No
- Data model changes: No
- Dependencies: `charm.land/bubbletea/v2 v2.0.0`
