---
td-board: adopt-cobra
td-issue: td-7db1a2
---

# Proposal: Adopt cobra

## Why

The staccato-cli interface module uses cobra for command-line argument parsing and subcommand routing. cobra is not yet formally adopted in the tech radar — this change records that adoption decision and documents the usage rules.

## What Changes

- cobra (`github.com/spf13/cobra`) added to tech radar at **Adopt**
- Usage rules documented in `.opencode/rules/technologies/go.md` (cobra section)

## Capabilities

### New Capabilities

- `cobra-adoption`: Adoption rationale, tech radar entry, and usage rules for cobra

### Modified Capabilities

*(none)*

## Impact

- Affected modules: `src/staccato-toolkit/cli/`
- API changes: No
- Data model changes: No
- Dependencies: `github.com/spf13/cobra v1.10.2`
