---
td-board: document-yarn-workspace-strategy-repository-layout-correction
td-issue: td-41dc90
---

# Specification: Repository Layout Correction

## Overview

Updates the canonical repository layout pattern rule to reflect Yarn 4.12.0 as the actual package manager and workspace tool, replacing outdated references to Bun that no longer match the implemented reality.

## MODIFIED Requirements

### Requirement: Repository layout pattern rule references Yarn

The canonical repository layout rule at `.opencode/rules/patterns/architecture/repository-layout.md` SHALL be updated to accurately reflect that Yarn 4.12.0 is the package manager and workspace tool for the repository.

**Details**:
- Update the "Root Files" table to describe `package.json` as the Yarn workspace manifest (not Bun)
- Update the "Root Files" table to describe `.yarn/` directory instead of `bun.lock`
- Include references to Yarn's configuration files (`.yarnrc.yml`, `.yarn/cache/`)
- Clarify that `.yarn/` and related Yarn artifacts are committed to git for reproducible installs
- Remove any references suggesting Bun is in use

#### Scenario: Workspace manifest is correctly documented

- **WHEN** a developer reads the repository layout rule's root files table
- **THEN** they see `package.json` correctly labeled as "Root Yarn workspace manifest"
- **AND** they understand that it declares workspace paths and shared scripts but NOT application dependencies

#### Scenario: Lock mechanism is correctly documented

- **WHEN** a developer reads the repository layout rule's root files table
- **THEN** they see `.yarn/` directory and `.yarn.lock` correctly documented as Yarn's committed artifacts
- **AND** they understand these ensure reproducible installs across environments

#### Scenario: Example tree reflects Yarn

- **WHEN** a developer reviews the example repository tree in the rule
- **THEN** it shows `package.json` and `.yarn/` (not `bun.lock`)
- **AND** it aligns with the actual repository structure

#### Scenario: Rule links to Yarn strategy ADR

- **WHEN** a developer reads the repository layout rule
- **THEN** it includes a reference link to `docs/adr/yarn-workspace-strategy.md` explaining why Yarn was chosen
- **AND** a note that questions about package manager choice should consult the ADR

## REMOVED Requirements

### Requirement: Bun workspace support (was previously documented)

**Reason**: Bun is not in use in the repository. The Yarn workspace is the implemented solution for JavaScript/TypeScript package management.

**Migration**: All package management operations use Yarn. Developers should consult the Yarn dependency usage rules pattern instead of expecting Bun compatibility.
