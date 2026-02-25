---
td-board: kubernetes-ui-tool-selection
td-issue: td-d89afa
status: "accepted"
date: 2026-02-27
decision-makers:
  - platform-architect-agent
consulted:
  - platform-engineers
informed:
  - developer-experience-team

tech-radar:
  - name: Headlamp
    quadrant: Infrastructure
    ring: Adopt
    description: >
      Selected as the platform's web-based Kubernetes UI. CNCF sandbox project,
      Apache 2.0 licensed, plugin-extensible, and supports CRD display natively.
      No cluster-side agents required for core functionality.
    moved: 1
---

# Design: Kubernetes UI Tool Selection

## Context and problem statement

The platform already provides `k9s` for terminal-based cluster navigation (devbox-packaged,
documented in `k9s-cluster-navigation` spec). However, a terminal UI is a barrier for:

- Developers who prefer graphical resource browsing
- Onboarding newcomers to Kubernetes concepts
- Visualising complex KubeVela `Application` resource trees and CRD state
- Sharing cluster state screenshots in async communication

We need to select, integrate, and document one web/graphical Kubernetes UI tool that
complements k9s without duplicating it.

## Decision criteria

This design achieves:

- **Open-source licence** (50%): Tool must be OSI-approved; vendor lock-in is unacceptable
- **Local-dev ergonomics** (25%): Installable without cluster-side agents; devbox-friendly
- **CRD / KubeVela support** (15%): Can display custom resources natively or via plugin
- **CNCF alignment** (10%): Preference for CNCF sandbox/incubating projects

Explicitly excludes:

- Evaluating paid/commercial Kubernetes management platforms (Rancher, OpenShift Console)
- Replacing k9s — the terminal UI remains the default for power users
- Cluster management features (RBAC editing, multi-cluster federation at scale)

## Considered options

### Option 1: Headlamp (headlamp.dev)

CNCF sandbox project (2022). Written in React + Go. Apache 2.0 licensed.

**Pros**:
- Native CRD display with custom views via plugin API
- No cluster-side agent required — runs as a desktop app or web server
- Plugin system (TypeScript) for extending the UI with platform-specific views
- Available as a Homebrew/binary download; devbox-installable via Nix `headlamp-k8s`
- Active community; CNCF-backed roadmap
- Works with `KUBECONFIG` env variable out of the box

**Cons**:
- Smaller plugin ecosystem than Lens (newer project)
- Desktop app ships as an Electron wrapper; web-server mode is the preferred path for devbox

### Option 2: Lens (open-source edition)

Popular Kubernetes IDE. Previously open-source; Mirantis changed the licence in 2023.

**Pros**:
- Rich feature set, large plugin ecosystem
- Familiar to many Kubernetes practitioners

**Cons**:
- **Licence concern**: As of Lens 6.x, the open-source "OpenLens" fork is unmaintained;
  the main distribution requires a Mirantis account for full functionality
- Vendor lock-in risk is unacceptable given our OSS-first posture
- **Eliminated on licence grounds**

### Option 3: Octant (VMware)

In-cluster web dashboard. VMware donated it to the CNCF but development stalled in 2022.

**Pros**:
- Solid CRD support via plugin system
- Fully web-based

**Cons**:
- **Archived / unmaintained** since mid-2022; no releases since v0.25
- Requires an in-cluster backend component
- **Eliminated due to abandonment**

### Option 4: Kubernetes Dashboard (upstream)

The official `kubernetes/dashboard` project.

**Pros**:
- Officially maintained by the Kubernetes SIG UI
- Helm-installable

**Cons**:
- Requires in-cluster deployment (not suitable for pure local-dev without extra setup)
- Limited CRD visualisation without custom resource definitions
- UI is functional but minimal — does not offer the onboarding experience we need
- **Not selected** — too infrastructure-heavy for local dev use case

## Decision outcome

**Selected: Headlamp** (`headlamp.dev`)

Headlamp is the only candidate that is simultaneously:
1. Actively maintained under an OSI-approved licence (Apache 2.0)
2. CNCF-backed (sandbox project)
3. Runnable without cluster-side components
4. Extensible for KubeVela CRD views via its plugin API

Lens was eliminated on licence grounds. Octant is unmaintained. Kubernetes Dashboard
requires in-cluster infrastructure that is excessive for local developer workflows.

### Integration approach

Headlamp will be integrated as:
1. A devbox-available binary (`headlamp-k8s` Nix package)
2. A `devbox run ui` script that launches Headlamp in server mode pointing to `$KUBECONFIG`
3. Usage rules at `.opencode/rules/patterns/kubernetes/headlamp.md`
4. A Backstage catalog `Component` entity
5. An ADR at `docs/adr/NNNN-kubernetes-ui-headlamp.md`
6. A tech radar entry at `Adopt` ring

## Considered options (decision matrix)

| Decision Criteria              | Headlamp         | Lens (OpenLens)  | Octant           | k8s Dashboard    |
|-------------------------------|------------------|------------------|------------------|------------------|
| OSI-approved licence          | ✓ Apache 2.0     | ✗ Mirantis acct  | ✓ Apache 2.0     | ✓ Apache 2.0     |
| No cluster-side agent         | ✓                | ✓                | ✗ (in-cluster)   | ✗ (in-cluster)   |
| Native CRD display            | ✓                | ✓                | ✓ (plugin)       | △ (limited)      |
| Active maintenance             | ✓ CNCF sandbox   | △ (Mirantis-led) | ✗ archived 2022  | ✓                |
| Devbox-installable            | ✓ (Nix pkg)      | △ (binary only)  | ✗                | ✗                |
| Plugin / extensibility        | ✓ (TypeScript)   | ✓                | ✓                | ✗                |
| CNCF alignment                | ✓ (sandbox)      | ✗                | △ (donated, dead)| ✓ (SIG UI)       |
| **Verdict**                   | **Selected**     | **Eliminated**   | **Eliminated**   | **Not selected** |

## Risks / trade-offs

- **Risk**: Headlamp CNCF sandbox status means it is not yet at incubating/graduated maturity →
  **Mitigation**: Add it to tech radar at `Adopt` ring reflecting our active endorsement; re-evaluate
  at next tech radar rotation if graduation is delayed
- **Risk**: Plugin API (TypeScript) is under active development; breaking changes possible →
  **Mitigation**: Pin to a specific Headlamp version in devbox; upgrade intentionally
- **Trade-off**: Headlamp's plugin ecosystem is smaller than Lens; custom KubeVela views
  require authoring a plugin → accepted; document in usage rules
- **Risk**: Nix `headlamp-k8s` package availability across devbox environments →
  **Mitigation**: Document binary download fallback in usage rules

## Migration plan

1. Add `headlamp-k8s` to `devbox.json` with pinned version
2. Add `devbox run ui` script to `devbox.json`
3. Create usage rules at `.opencode/rules/patterns/kubernetes/headlamp.md`
4. Create Backstage catalog entity in `.entities/headlamp.yaml`
5. Write ADR at `docs/adr/NNNN-kubernetes-ui-headlamp.md`
6. Update `docs/tech-radar.json` with Headlamp entry at `Adopt`
7. Update `openspec/specs/kubernetes-support-rationale/spec.md` with delta

Rollback: remove devbox entry; no cluster-side components to uninstall.

## Confirmation

- `devbox run ui` launches Headlamp and connects to local cluster
- Headlamp displays KubeVela `Application` CRDs in the UI
- Usage rules pass review and are linked from Backstage TechDocs
- ADR present in `docs/adr/` and linked from catalog entity
- Tech radar entry present in `docs/tech-radar.json`

## Open questions

- Determine the next available ADR number for `docs/adr/NNNN-kubernetes-ui-headlamp.md`
- Confirm whether `headlamp-k8s` Nix package supports the latest stable Headlamp release
- Evaluate whether a KubeVela plugin already exists in the Headlamp plugin registry

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Headlamp | platform-architect | `.opencode/rules/patterns/kubernetes/headlamp.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Headlamp local UI workflow | worker | — | none | Headlamp is a developer tool, not an agent-facing workflow; usage rules document the pattern |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | headlamp | create | platform | `.entities/headlamp.yaml` | declared | Headlamp is a platform-provided developer tool component |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| headlamp | `docs/mkdocs.yml` | `docs/adr/` | Kubernetes UI tool guide | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
