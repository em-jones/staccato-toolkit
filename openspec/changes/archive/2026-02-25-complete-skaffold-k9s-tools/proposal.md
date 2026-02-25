---
td-board: complete-skaffold-k9s-tools
td-issue: td-6857da
---

# Proposal: Complete Skaffold & k9s Tools Integration

## Why

Skaffold and k9s were partially added to devbox but lack integration documentation and usage rules. Development workflows need clear guidance on how to use these tools for local dev cluster management and rapid iteration, and the devbox installation is incomplete without formal adoption specs and usage patterns.

## What Changes

- Complete devbox installation and configuration for Skaffold and k9s
- Create usage rules and patterns for local dev workflows with Skaffold
- Document k9s cluster navigation and interaction patterns
- Establish best practices for rapid iteration using Skaffold dev mode

## Capabilities

### New Capabilities

- `skaffold-local-dev`: Skaffold integration in devbox for local development workflows, dev mode setup, and hot-reload configuration
- `k9s-cluster-navigation`: k9s tool usage for cluster exploration, pod management, and interactive debugging in local dev environments

### Modified Capabilities

(None)

## Impact

- Affected services/modules: Local development tooling, devbox configuration, documentation
- API changes: No
- Data model changes: No
- Dependencies: Skaffold, k9s (already added to devbox, now being formalized)
