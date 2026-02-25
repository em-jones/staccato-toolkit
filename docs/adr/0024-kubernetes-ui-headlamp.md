---
status: accepted
date: 2026-02-27
decision-makers:
  - platform-architect-agent
consulted:
  - platform-engineers
informed:
  - developer-experience-team
---

# ADR-0024: Headlamp as the Platform Kubernetes Web UI

## Status

Accepted

## Context

The platform provides `k9s` for terminal-based Kubernetes cluster navigation. However, a
terminal UI is a barrier for developers who prefer graphical browsing, for onboarding
newcomers, and for visualising complex KubeVela `Application` resource trees.

Four candidate tools were evaluated:

| Tool | Licence | Cluster agent? | CRD support | CNCF? | Active? |
|------|---------|----------------|-------------|-------|---------|
| Headlamp | Apache 2.0 | Not required | Native + plugins | Sandbox | Yes |
| Lens (OpenLens) | Mirantis proprietary | Not required | Plugin-based | No | Fork dead |
| Octant | Apache 2.0 | Required | Plugin-based | Donated, archived | No (2022) |
| k8s Dashboard | Apache 2.0 | Required | Limited | SIG UI | Yes |

Full evaluation: `docs/decisions/kubernetes-ui-tool-evaluation.md`

## Decision

**Adopt Headlamp** as the platform's web-based Kubernetes UI tool.

Headlamp is integrated into the devbox environment via the `headlamp-k8s` Nix package and
launched with `devbox run ui`. It requires no in-cluster components for core use and natively
displays CRDs including KubeVela resources.

## Rationale

1. **Licence**: Apache 2.0 — consistent with the platform's OSS-first posture
2. **No in-cluster agent**: core features work against a local kind cluster without additional
   in-cluster infrastructure
3. **CRD support**: KubeVela `Application` and `ComponentDefinition` CRDs are displayed
   natively without configuration
4. **CNCF sandbox**: governance and longevity expectations are met
5. **Devbox-installable**: `headlamp-k8s` Nix package enables reproducible installation

## Rejected Alternatives

- **Lens / OpenLens**: Mirantis relicensing of Lens 6+ makes the main distribution
  incompatible with the OSS-first posture; the OpenLens community fork is unmaintained
- **Octant**: archived by VMware in mid-2022; no releases since v0.25; requires in-cluster
  backend component
- **Kubernetes Dashboard**: requires in-cluster deployment via Helm, excessive for local dev;
  no plugin/extensibility system for CRD views

## Consequences

- `headlamp-k8s@latest` added to `devbox.json`
- `devbox run ui` script launches Headlamp pointing to `$KUBECONFIG`
- Usage rules published at `.opencode/rules/patterns/kubernetes/headlamp.md`
- Tech radar updated: Headlamp at `Adopt` ring, Infrastructure quadrant
- `kubernetes-support-rationale` spec updated to reference both k9s (terminal) and
  Headlamp (web UI) in the toolchain section
- Backstage catalog entity registered as `Resource` kind

## References

- [Headlamp website](https://headlamp.dev)
- [CNCF sandbox listing](https://www.cncf.io/projects/headlamp/)
- Full evaluation: `docs/decisions/kubernetes-ui-tool-evaluation.md`
- Change: `openspec/changes/kubernetes-ui-tool-selection/`
