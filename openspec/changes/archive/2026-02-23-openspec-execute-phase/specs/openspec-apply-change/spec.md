---
td-board: openspec-execute-phase-openspec-apply-change
td-issue: td-34bed0
---

# Specification: openspec-apply-change (delta)

## Overview

Delta spec marking `openspec-apply-change` as deprecated. All requirements are removed; the skill is replaced by `openspec-execute`.

## REMOVED Requirements

### Requirement: Handoff before review submission

**Reason**: `openspec-apply-change` is deprecated and replaced by `openspec-execute`, which owns the full implement→review lifecycle including handoff behaviour.

**Migration**: Use `openspec-execute` instead of `openspec-apply-change`. The handoff-before-review behaviour is preserved in `openspec-execute`'s "Handoff and submit for review on task completion" requirement.
