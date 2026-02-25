# 0014. Kubernetes as Orchestration Platform

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec services require orchestration for deployment, scaling, health checks, and service discovery. We need a platform that supports declarative configuration, rolling updates, and observability integration.

Kubernetes provides:
- Declarative infrastructure (YAML manifests, Helm charts)
- Built-in service discovery and load balancing
- Health checks (liveness, readiness, startup probes)
- Horizontal pod autoscaling based on metrics
- Native integration with Prometheus, OpenTelemetry, and logging

Alternatives considered:
- **Docker Compose**: Simple but lacks production-grade orchestration
- **Nomad**: Simpler than Kubernetes but smaller ecosystem
- **ECS/Fargate**: AWS-specific, vendor lock-in
- **Cloud Run**: Serverless but limited control and customization

## Decision

Adopt Kubernetes as the standard orchestration platform for all OpenSpec production services.

Services must:
- Provide Kubernetes manifests (Deployment, Service, Ingress)
- Implement health check endpoints (/healthz, /readyz)
- Configure resource limits (CPU, memory)
- Use ConfigMaps and Secrets for configuration
- Integrate with Kubernetes service mesh (if applicable)

## Consequences

**Easier:**
- Declarative deployment and configuration management
- Rolling updates with automatic rollback on failure
- Service discovery via DNS (service-name.namespace.svc.cluster.local)
- Native Prometheus metrics scraping via ServiceMonitor
- Horizontal scaling based on CPU, memory, or custom metrics

**Harder:**
- Steep learning curve for Kubernetes concepts
- YAML verbosity and complexity
- Cluster management and maintenance overhead
- Networking complexity (Ingress, NetworkPolicy, service mesh)
- Cost of running control plane and worker nodes

**Maintenance implications:**
- Kubernetes manifests must be maintained alongside code
- Cluster upgrades require testing and coordination
- RBAC policies must be configured for security
- Monitoring and alerting for cluster health required
- Disaster recovery and backup strategies needed

## Related Decisions

- ADR-0012: Adopt Docker containers for deployment
- ADR-0011: Prometheus metrics exposure
- ADR-0017: Kind for local Kubernetes development
- Usage rule: Kubernetes manifest patterns
