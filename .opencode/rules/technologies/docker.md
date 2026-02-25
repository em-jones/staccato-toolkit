---
created-by-change: technology-audit
last-validated: 2026-02-25
---

# Docker

Docker is a containerization platform that packages applications with their dependencies into isolated, reproducible execution environments.

## Purpose

Enable consistent application deployment across development, testing, and production environments by encapsulating code, runtime, and dependencies in a container image.

## When to use

- Building distributable application packages
- Running services in Kubernetes or other container orchestration platforms
- Isolating development environments

## Usage Standards

- Use multi-stage builds to minimize final image size
- Prefer distroless or alpine base images for production
- Run containers as non-root users whenever possible
- Pin base image versions; avoid `latest` tags in production
- Keep Dockerfile at the repository root or in a `docker/` directory
- Use `.dockerignore` to exclude unnecessary files from the build context
- Scan images for vulnerabilities using [Trivy](./trivy.md)

## Related

- [Distroless](./distroless.md) — Minimal base images
- [Trivy](./trivy.md) — Container image vulnerability scanning
- [Skaffold](./k8s.md#skaffold-continuous-development) — Container build and deploy automation
