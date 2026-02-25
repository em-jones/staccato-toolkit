# 0013. Use Distroless Base Images

**Date:** 2026-02-25

## Status
Accepted

## Context

Docker images for production services should minimize attack surface and image size. Traditional base images (ubuntu, alpine) include package managers, shells, and utilities unnecessary for running statically-compiled binaries.

Google's **distroless** images contain only the application and runtime dependencies (libc, SSL certificates, timezone data). They exclude shells, package managers, and debugging tools.

For Go services, distroless images are ideal because Go compiles to static binaries with no runtime dependencies beyond libc.

Alternatives considered:
- **Alpine Linux**: Minimal but includes shell and package manager
- **Ubuntu/Debian**: Full-featured but large attack surface
- **Scratch**: Minimal but lacks SSL certificates and timezone data

## Decision

Adopt **distroless** base images for all production container images.

Multi-stage Dockerfiles must:
- Build stage: Use full base image (golang:1.23, node:24) with build tools
- Runtime stage: Use distroless image (gcr.io/distroless/static, gcr.io/distroless/nodejs)
- Copy only compiled binaries and necessary assets to runtime stage

## Consequences

**Easier:**
- Minimal attack surface (no shell, no package manager)
- Smaller image sizes (10-50MB vs 100-500MB)
- Faster image pulls and deployments
- Reduced vulnerability scan findings
- Compliant with security best practices

**Harder:**
- No shell for debugging (requires ephemeral debug containers)
- Cannot install packages at runtime
- Troubleshooting requires alternative approaches (port-forward, logs)
- Multi-stage Dockerfiles slightly more complex

**Maintenance implications:**
- Dockerfiles must use multi-stage builds
- Debugging in production requires Kubernetes ephemeral containers
- Static assets must be explicitly copied to runtime stage
- SSL certificates and timezone data included in distroless images
- Base image updates require rebuilding and redeploying services

## Related Decisions

- ADR-0012: Adopt Docker containers for deployment
- ADR-0014: Kubernetes as orchestration platform
- ADR-0001: Adopt Go 1.23 (static binaries)
- Usage rule: Multi-stage Dockerfile patterns
