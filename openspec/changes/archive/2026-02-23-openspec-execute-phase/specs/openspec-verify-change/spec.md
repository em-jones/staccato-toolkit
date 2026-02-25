---
td-board: openspec-execute-phase-openspec-verify-change
td-issue: td-2a36c7
---

# Specification: openspec-verify-change (delta)

## Overview

Delta spec marking `openspec-verify-change` as deprecated. All requirements are removed; the skill is replaced by `openspec-execute`.

## REMOVED Requirements

### Requirement: Handoff before task approval

**Reason**: `openspec-verify-change` is deprecated and replaced by `openspec-execute`, which owns the full review lifecycle including approval handoff behaviour.

**Migration**: Use `openspec-execute` instead of `openspec-verify-change`. The handoff-before-approval behaviour is preserved in `openspec-execute`'s "Approve tasks with handoff" requirement.

### Requirement: Handoff before task rejection

**Reason**: `openspec-verify-change` is deprecated and replaced by `openspec-execute`, which owns the full review lifecycle including rejection handoff behaviour.

**Migration**: Use `openspec-execute` instead of `openspec-verify-change`. The handoff-before-rejection behaviour is preserved in `openspec-execute`'s "Reject tasks with actionable handoff" requirement.
