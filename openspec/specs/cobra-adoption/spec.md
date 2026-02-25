---
td-board: adopt-cobra-cobra-adoption
td-issue: td-7db1a2
---

# Specification: cobra Adoption

## Overview

Records the formal adoption of cobra as the platform's CLI framework and defines the usage rules governing its use in staccato-cli and any future command-line interface modules.

## ADDED Requirements

### Requirement: cobra usage rules documented

The platform SHALL maintain usage rules for cobra at `.opencode/rules/technologies/go.md` covering: root command setup, subcommand registration, `cmd.Println` over `fmt.Println` for testability, and error handling conventions.

#### Scenario: Agent implements a CLI command

- **WHEN** a worker agent adds a subcommand to `staccato-cli`
- **THEN** it consults `.opencode/rules/technologies/go.md#cobra` for command structure and output conventions

### Requirement: cobra on tech radar at Adopt

cobra SHALL appear in `docs/tech-radar.json` at ring **Adopt** in the Languages & Frameworks quadrant.

#### Scenario: Tech radar reflects adoption decision

- **WHEN** a developer queries the tech radar
- **THEN** cobra is listed at Adopt, signalling it is the recommended CLI framework for this platform
