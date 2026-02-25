---
td-board: adopt-bubble-tea-bubble-tea-adoption
td-issue: td-4971b0
---

# Specification: Bubble Tea v2 Adoption

## Overview

Records the formal adoption of Bubble Tea v2 as the platform's TUI framework and defines the usage rules that govern its use in staccato-tui and any future terminal interface modules.

## ADDED Requirements

### Requirement: Bubble Tea v2 usage rules documented

The platform SHALL maintain usage rules for Bubble Tea v2 at `.opencode/rules/technologies/go.md` covering: Elm Architecture model structure, `Init`/`Update`/`View` API (v2 signatures), keyboard handling via `tea.KeyPressMsg`, logging redirection to stderr, and testing patterns.

#### Scenario: Agent implements a TUI feature

- **WHEN** a worker agent implements a feature in `staccato-tui`
- **THEN** it consults `.opencode/rules/technologies/go.md#bubble-tea-v2` for API conventions and patterns

### Requirement: Bubble Tea v2 on tech radar at Adopt

Bubble Tea v2 SHALL appear in `docs/tech-radar.json` at ring **Adopt** in the Languages & Frameworks quadrant.

#### Scenario: Tech radar reflects adoption decision

- **WHEN** a developer queries the tech radar
- **THEN** Bubble Tea v2 is listed at Adopt, signalling it is the recommended TUI framework for this platform
