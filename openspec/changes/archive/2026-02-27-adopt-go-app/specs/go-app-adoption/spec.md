---
td-board: adopt-go-app-go-app-adoption
td-issue: td-87b3e8
---

# Specification: go-app v10 Adoption

## Overview

Records the formal adoption of go-app v10 as the platform's WASM/PWA framework (at Trial ring) and defines the usage rules governing its use in staccato-web.

## ADDED Requirements

### Requirement: go-app v10 usage rules documented

The platform SHALL maintain usage rules for go-app v10 at `.opencode/rules/technologies/go.md` covering: component lifecycle (`app.Compo` embedding), `ctx.Dispatch` for state mutations, `app.RunWhenOnBrowser()` for dual-build entry points, WASM compilation (`GOOS=js GOARCH=wasm`), and the multi-stage Containerfile pattern.

#### Scenario: Agent implements a PWA component

- **WHEN** a worker agent implements a UI component in `staccato-web`
- **THEN** it consults `.opencode/rules/technologies/go.md#go-app-v10` for component patterns and WASM build conventions

### Requirement: go-app v10 on tech radar at Trial

go-app v10 SHALL appear in `docs/tech-radar.json` at ring **Trial** in the Languages & Frameworks quadrant, reflecting that it is in active use but not yet at full Adopt status.

#### Scenario: Tech radar reflects trial decision

- **WHEN** a developer queries the tech radar
- **THEN** go-app v10 is listed at Trial, signalling active use with evaluation ongoing
