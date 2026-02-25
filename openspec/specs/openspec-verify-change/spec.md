# Specification: openspec-verify-change

> **DEPRECATED** — `openspec-verify-change` is replaced by `openspec-execute`, which owns the full implement→review lifecycle. See `openspec-execute` spec.

## Purpose

This capability has been deprecated. All requirements previously defined here have been removed and superseded by `openspec-execute`.

## REMOVED Requirements

### Requirement: Handoff before task approval

**Removed in**: openspec-execute-phase change  
**Reason**: `openspec-verify-change` is deprecated and replaced by `openspec-execute`, which owns the full review lifecycle including approval handoff behaviour.  
**Migration**: Use `openspec-execute`. The handoff-before-approval behaviour is preserved in `openspec-execute`'s "Approve tasks with handoff" requirement.

### Requirement: Handoff before task rejection

**Removed in**: openspec-execute-phase change  
**Reason**: `openspec-verify-change` is deprecated and replaced by `openspec-execute`, which owns the full review lifecycle including rejection handoff behaviour.  
**Migration**: Use `openspec-execute`. The handoff-before-rejection behaviour is preserved in `openspec-execute`'s "Reject tasks with actionable handoff" requirement.
