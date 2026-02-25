---
td-board: support-kubernetes
td-issue: td-199485
---

# Proposal: Support Kubernetes

## Why

This platform toolkit orchestrates the development, delivery, and operation of services across the organisation. Kubernetes has become the de-facto standard for deploying and managing containerised workloads at scale. Without first-class Kubernetes support, the toolkit cannot fulfil its mission as a complete platform for building and operating production services — teams are left to configure and manage Kubernetes tooling ad-hoc, eroding consistency and increasing toil.

## What Changes

- Add Kubernetes as a first-class supported runtime target in the platform toolkit
- Define the canonical set of Kubernetes tooling that developers use locally and in CI (kubectl, helm, k9s, kind, skaffold, etc.)
- Establish conventions for how the platform toolkit interacts with Kubernetes clusters (local via kind, remote via kubeconfig)
- Document the rationale and toolchain choices so future platform decisions are grounded in this ADR

## Capabilities

### New Capabilities

- `kubernetes-support-rationale`: A design document making the case for Kubernetes adoption and outlining the tools the platform will use to support it (tool selection, local-dev cluster, CI integration surface)

### Modified Capabilities

*(none)*

## Impact

- Affected systems: devbox dev environment, CI pipeline, platform documentation
- API changes: None — this change is design and documentation only
- Data model changes: None
- Dependencies: No new runtime dependencies added in this change; tooling dependencies are introduced in follow-on changes (helm, kubectl, k9s, kind, skaffold)
