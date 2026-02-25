---
date: 2026-02-27
change: kubernetes-ui-tool-selection
---

# Kubernetes UI Tool Evaluation

## Selection Criteria

The following weighted criteria guide the tool selection. Each criterion is scored 1–3
(1 = does not meet, 2 = partially meets, 3 = fully meets).

| # | Criterion | Weight | Rationale |
|---|-----------|--------|-----------|
| 1 | OSI-approved open-source licence | 50% | Platform has a strict OSS-first posture; vendor lock-in is unacceptable |
| 2 | No cluster-side agent required for local dev | 25% | Developers run a single local kind cluster; overhead of in-cluster components is undesirable |
| 3 | Native or plugin-based CRD / KubeVela support | 15% | Platform uses KubeVela; UI must display Application and ComponentDefinition CRDs |
| 4 | CNCF project alignment | 10% | CNCF-backed projects align with platform governance and longevity expectations |

All tools MUST score 3 on criterion 1 (OSI licence) to be considered. A score of 1 on this
criterion is an automatic disqualification.

## Candidate Tools

### 1. Headlamp (headlamp.dev)

| Property | Detail |
|----------|--------|
| Licence | Apache 2.0 ✓ |
| Version evaluated | v0.25.x (stable) |
| CNCF status | Sandbox (since 2022) |
| Cluster-side agent | Not required for core use |
| CRD support | Native — CRDs shown automatically; plugin API for custom views |
| Extensibility | TypeScript plugin API |
| Devbox install | `headlamp-k8s` Nix package ✓ |
| Maintenance | Active; regular releases |

### 2. Lens / OpenLens

| Property | Detail |
|----------|--------|
| Licence | **Mirantis proprietary** for main distribution (Lens 6+) ✗ |
| OpenLens fork | Unmaintained since late 2023 |
| CNCF status | None |
| Cluster-side agent | Not required |
| CRD support | Yes (plugin-based) |
| Extensibility | Extensions API |
| Devbox install | Binary only |
| Maintenance | Mirantis-led; OSS fork dead |

**Disqualified** on licence grounds (criterion 1 score = 1).

### 3. Octant (VMware / CNCF)

| Property | Detail |
|----------|--------|
| Licence | Apache 2.0 ✓ |
| CNCF status | Donated to CNCF; development archived mid-2022 |
| Cluster-side agent | Required (in-cluster backend) ✗ |
| CRD support | Yes (plugin-based) |
| Extensibility | Go plugin API |
| Devbox install | Binary only; no Nix package |
| Maintenance | **Archived — no releases since v0.25 (2022)** |

**Eliminated**: archived/unmaintained project; in-cluster component requirement.

### 4. Kubernetes Dashboard (upstream)

| Property | Detail |
|----------|--------|
| Licence | Apache 2.0 ✓ |
| CNCF status | Official Kubernetes SIG UI project |
| Cluster-side agent | **Required** (Helm chart deploys in-cluster) ✗ |
| CRD support | Limited; no native CRD navigation |
| Extensibility | None (no plugin system) |
| Devbox install | Helm only; no standalone binary |
| Maintenance | Active |

**Not selected**: in-cluster requirement excessive for local dev; no extensibility for CRD views.

## Comparison Matrix

| Criterion (weight) | Headlamp | Lens/OpenLens | Octant | k8s Dashboard |
|--------------------|----------|---------------|--------|---------------|
| OSI licence (50%) | 3 ✓ | **1 ✗** | 3 ✓ | 3 ✓ |
| No cluster-side agent (25%) | 3 ✓ | 3 ✓ | 1 ✗ | 1 ✗ |
| CRD/KubeVela support (15%) | 3 ✓ | 2 △ | 2 △ | 1 ✗ |
| CNCF alignment (10%) | 3 ✓ | 1 ✗ | 2 △ | 3 ✓ |
| **Weighted score** | **3.0** | **DQ** | **1.8** | **2.1** |
| **Active maintenance** | ✓ | △ | ✗ | ✓ |
| **Verdict** | ✅ Selected | ❌ Disqualified | ❌ Eliminated | ❌ Not selected |

## Recommendation

**Selected tool: Headlamp**

Headlamp is the only candidate that:
1. Passes the licence gate (Apache 2.0, OSI-approved)
2. Runs without any in-cluster components for core use
3. Natively displays CRDs including KubeVela `Application` resources
4. Is actively maintained under CNCF governance

**Rejected alternatives**:
- **Lens**: disqualified; Mirantis relicensing makes it incompatible with OSS-first posture
- **Octant**: eliminated; archived project with no releases since 2022, plus in-cluster requirement
- **Kubernetes Dashboard**: not selected; requires in-cluster deployment and has no extensibility for CRD views

## Devbox Installation Plan

```json
// devbox.json addition
{
  "packages": ["headlamp-k8s@latest"],
  "shell": {
    "scripts": {
      "ui": "headlamp-k8s --kubeconfig $KUBECONFIG"
    }
  }
}
```

If `headlamp-k8s` is not available in the active Nixpkgs channel, fall back to:
```bash
# Binary download (documented in usage rules)
curl -L https://github.com/headlamp-k8s/headlamp/releases/latest/download/headlamp-linux-amd64 \
  -o ~/.local/bin/headlamp && chmod +x ~/.local/bin/headlamp
```
