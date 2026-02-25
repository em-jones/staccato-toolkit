# 0012. Adopt Docker Containers

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec services must run consistently across development, CI/CD, and production environments. We need a containerization solution that provides isolation, portability, and ecosystem compatibility.

Docker provides:
- Standardized container format (OCI-compliant)
- Rich ecosystem of base images and tooling
- Native support in Kubernetes and CI/CD platforms
- Multi-stage builds for optimized image sizes

Alternatives considered:
- **Podman**: OCI-compatible but less ecosystem support
- **Buildah**: Flexible but primarily for image building, not runtime
- **Native binaries**: Simpler but lacks isolation and portability

## Decision

Adopt Docker as the standard containerization platform for all OpenSpec services.

All services must:
- Provide a `Dockerfile` with multi-stage builds
- Use distroless or minimal base images (see ADR-0013)
- Build images in CI/CD pipelines
- Tag images with semantic versions and commit SHAs
- Scan images for vulnerabilities before deployment

## Consequences

**Easier:**
- Consistent runtime environment across dev, CI, and production
- Isolation of dependencies and system libraries
- Portable deployments across cloud providers and Kubernetes
- Rich ecosystem of base images (Go, Node.js, distroless)
- Native integration with Kubernetes and Docker Compose

**Harder:**
- Image size optimization requires careful layering
- Build time can be slow without caching strategies
- Security scanning adds complexity to CI/CD
- Local development requires Docker daemon

**Maintenance implications:**
- Dockerfiles must be maintained alongside application code
- Base images must be updated for security patches
- Image registry must be managed (storage, access control)
- CI/CD must build, scan, and push images
- Multi-architecture builds (amd64, arm64) may be required

## Related Decisions

- ADR-0013: Use distroless base images for production
- ADR-0014: Kubernetes as orchestration platform
- ADR-0015: Adopt Dagger for pipeline-as-code
- Usage rule: Dockerfile best practices
