---
td-board: document-yarn-workspace-strategy
td-issue: td-45f57a
---

# Proposal: Document Yarn Workspace Strategy

## Why

The repository adopted Yarn 4.12.0 as its package manager and workspace tool, but this decision lacks documented rationale, architecture decision record, or usage rules. The canonical repository layout rule currently references Bun as the workspace manager, creating a discrepancy between documented expectations and actual practice. Without explicit documentation of why Yarn was chosen and how it should be used, future maintainers cannot understand the architectural intent, and new developers lack guidance on dependency management patterns.

## What Changes

- Document the rationale for choosing Yarn 4.12.0 over npm, Bun, and pnpm
- Create an ADR establishing Yarn as the package manager of choice
- Define workspace isolation and dependency management rules
- Create usage rules for declaring dependencies in the monorepo
- Update the canonical repository layout rule to reference Yarn instead of Bun

## Capabilities

### New Capabilities

- `yarn-workspace-strategy-adr`: Architecture decision record capturing why Yarn was chosen and when
- `yarn-dependency-usage-rules`: Usage rules governing how dependencies are declared and managed across workspace packages
- `repository-layout-correction`: Update the canonical repository layout pattern rule to reflect Yarn instead of Bun

### Modified Capabilities

- None

## Impact

- **Affected documentation**: Canonical repository layout rule (`.opencode/rules/patterns/architecture/repository-layout.md`)
- **New pattern rules**: Two new entries in `.opencode/rules/patterns/` tree for Yarn-specific patterns
- **No API changes**: This is purely documentation and decision capture
- **No code changes**: Implementation is complete; only documentation gap remains
- **Developer experience**: Clarifies package manager choice and establishes governance for dependency management
