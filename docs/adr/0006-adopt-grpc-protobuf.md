# 0006. Adopt gRPC + Protobuf

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec services require efficient, type-safe service-to-service communication. We need a protocol that supports strong contracts, code generation, and high performance for internal APIs.

gRPC with Protocol Buffers provides:
- Strongly-typed service definitions with schema evolution
- Efficient binary serialization (smaller payloads than JSON)
- HTTP/2 multiplexing and streaming support
- Code generation for Go, TypeScript, and other languages

Alternatives considered:
- **REST + JSON**: Human-readable but lacks strong contracts and code generation
- **GraphQL**: Flexible queries but adds complexity for service-to-service calls
- **Thrift**: Similar capabilities but smaller ecosystem and tooling

## Decision

Adopt gRPC with Protocol Buffers (proto3) for all internal service-to-service communication within OpenSpec.

Services must define APIs using `.proto` files with versioned packages. Code generation must be automated in CI/CD pipelines. Public-facing APIs should use REST via grpc-gateway (see ADR-0008).

## Consequences

**Easier:**
- Strong API contracts with compile-time type safety
- Automatic client/server code generation
- Efficient binary protocol reduces bandwidth and latency
- Built-in support for streaming (server-side, client-side, bidirectional)
- OpenTelemetry instrumentation for gRPC available

**Harder:**
- Requires protobuf toolchain (protoc, buf, code generators)
- Schema evolution requires careful planning (field numbering, deprecation)
- Debugging binary payloads less intuitive than JSON
- Browser clients require grpc-web proxy

**Maintenance implications:**
- Proto files must be versioned and maintained in shared repository
- Breaking changes require coordination across services
- CI/CD must validate proto compatibility and generate code
- Services must implement graceful handling of unknown fields

## Related Decisions

- ADR-0001: Adopt Go 1.23 for backend services
- ADR-0008: REST gateway for gRPC services
- ADR-0009: Adopt OpenTelemetry for observability
- Usage rule: gRPC service design patterns (to be created)
