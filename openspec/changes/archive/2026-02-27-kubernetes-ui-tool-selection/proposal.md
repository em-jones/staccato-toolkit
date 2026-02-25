---
td-board: kubernetes-ui-tool-selection
td-issue: td-d89afa
---

# Proposal: Kubernetes UI Tool Selection

## Why

The platform has k9s for terminal-based cluster navigation, but developers and operators working
with complex workloads benefit from a graphical or web-based Kubernetes UI for visualising
resource relationships, inspecting CRD state, and onboarding new team members. Tools like
Headlamp, Lens, and Octant offer different trade-offs; we need to evaluate, select, and
integrate one into the platform toolchain.

## What Changes

- Evaluate Kubernetes web/GUI UI tools: Headlamp, Lens, Octant, and k8s Dashboard
- Select one tool based on: open-source licence, extensibility, local-dev fit, KubeVela/CRD
  awareness, and CNCF alignment
- Integrate the selected tool into the devbox environment (devbox package or run script)
- Document adoption rationale in an ADR
- Publish usage rules for the selected tool

## Capabilities

### New Capabilities

- `tool-evaluation`: Structured comparison of candidate Kubernetes UI tools against defined
  selection criteria, producing a decision matrix and recommendation
- `tool-integration`: Devbox integration of the selected tool (install, run, kubeconfig wiring)
  and usage rules for the platform workflow
- `adoption-adr`: ADR documenting the decision, alternatives considered, and rationale

### Modified Capabilities

- `kubernetes-support-rationale`: Update the existing toolchain spec to reference the selected
  UI tool alongside k9s (cluster UI section)

## Impact

- Affected services/modules: devbox environment, local cluster setup, docs/adr
- API changes: No
- Data model changes: No
- Dependencies: Selected tool binary (via devbox or direct install); no new Go dependencies
