# 0017. Kind for Local Kubernetes Development

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec services deploy to Kubernetes in production (ADR-0014). Developers need a local Kubernetes environment for testing manifests, Helm charts, and service interactions before deploying to staging/production.

**Kind (Kubernetes in Docker)** runs Kubernetes clusters in Docker containers, providing:
- Fast cluster creation (30-60 seconds)
- Multiple cluster support for testing
- Consistent with production Kubernetes API
- Minimal resource overhead compared to full VMs

Alternatives considered:
- **Minikube**: Full-featured but heavier (VM-based by default)
- **k3s/k3d**: Lightweight but uses modified Kubernetes distribution
- **Docker Desktop Kubernetes**: Convenient but single-cluster and less flexible
- **Remote dev clusters**: Shared state, slower feedback loop

## Decision

Adopt Kind as the standard local Kubernetes environment for OpenSpec development.

Developers must:
- Use Kind clusters for testing Kubernetes manifests and Helm charts
- Create ephemeral clusters for testing (create, test, delete)
- Load local Docker images into Kind clusters for testing
- Use Kind configuration files for consistent cluster setup

## Consequences

**Easier:**
- Fast cluster creation and deletion (ephemeral testing)
- Consistent Kubernetes API with production
- Multiple clusters for parallel testing
- Lightweight resource usage (Docker containers, not VMs)
- Easy integration with CI/CD (Dagger, GitHub Actions)

**Harder:**
- Requires Docker daemon running locally
- Limited to single-node clusters by default (multi-node possible)
- LoadBalancer services require extra configuration (MetalLB or port-forward)
- Persistent storage requires hostPath volumes

**Maintenance implications:**
- Kind configuration files should be versioned in repository
- Documentation must include Kind setup instructions
- CI/CD pipelines can use Kind for integration testing
- Developers must load images into Kind: `kind load docker-image <image>`
- Cluster cleanup required to avoid Docker resource exhaustion

## Related Decisions

- ADR-0014: Kubernetes as orchestration platform
- ADR-0012: Adopt Docker containers
- ADR-0018: Devbox for consistent development environments
- Usage rule: Local Kubernetes development with Kind
