---
td-board: adopt-penpot
td-issue: td-c336b6
---

# Proposal: Adopt Penpot — UI Design Platform

## Why

The platform needs a collaborative UI/UX design tool that teams can self-host on the same Kubernetes infrastructure used for all other platform services. Penpot (open-source, web-based) fills this gap and already has initial Garden/Helm configuration in `src/ops/penpot/` that requires formalization through the standard OpenSpec adoption workflow.

## What Changes

- Validate and fix the existing `src/ops/penpot/garden.yml` against current Garden usage rules (apiVersion, chart repo, port-forward configuration)
- Validate and fix `src/ops/penpot/values.yaml` for local dev correctness
- Add Penpot to the Tech Radar (Infrastructure quadrant, Trial ring)
- Create a usage rule for Penpot at `.opencode/rules/technologies/penpot.md`
- Create a Backstage catalog entity for the Penpot deployment
- Register the Penpot Helm chart in the platform helm usage rules

## Capabilities

### New Capabilities

- `penpot-deployment`: Deploy Penpot via Garden + Helm to the `penpot` namespace on `kind-staccato-dev`, including PostgreSQL and persistent storage, with validated health-check Test action

### Modified Capabilities

_(none — no existing capability spec changes)_

## Impact

- Affected services/modules: `src/ops/penpot/` (existing files, needs fixing)
- API changes: No
- Data model changes: No
- Dependencies: Penpot Helm chart (official chart, needs correct repo URL), PostgreSQL (bundled via Helm chart)
