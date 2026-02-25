# 0008. REST Gateway for gRPC

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec uses gRPC for internal service-to-service communication (ADR-0006), but external clients (web browsers, third-party integrations, CLI tools) often require REST/JSON APIs.

Running separate REST and gRPC servers duplicates logic and creates maintenance burden. We need a way to expose gRPC services as REST APIs without duplicating implementation.

**grpc-gateway** generates a reverse-proxy server that translates RESTful JSON API calls into gRPC. It uses annotations in `.proto` files to define REST mappings.

Alternatives considered:
- **Separate REST handlers**: Full control but duplicates business logic
- **Connect (buf.build)**: Modern but less mature ecosystem
- **gRPC-web**: Browser-friendly but not RESTful JSON

## Decision

Adopt **grpc-gateway** to expose gRPC services as REST/JSON APIs for external clients.

Services define HTTP mappings in `.proto` files using `google.api.http` annotations. The gateway generates OpenAPI/Swagger documentation automatically. Internal services use native gRPC; external clients use REST.

## Consequences

**Easier:**
- Single source of truth (proto definitions) for gRPC and REST
- Automatic REST API generation from gRPC services
- OpenAPI documentation generated from proto annotations
- No duplication of business logic between gRPC and REST
- Browser and CLI clients can use standard HTTP/JSON

**Harder:**
- Requires HTTP mapping annotations in proto files
- Not all gRPC patterns map cleanly to REST (streaming)
- Gateway adds latency compared to native gRPC
- Proto files become more complex with HTTP annotations

**Maintenance implications:**
- Proto files must include google.api.http annotations
- OpenAPI documentation must be published for external consumers
- Gateway deployment must be configured in Kubernetes
- Streaming APIs may require alternative approaches (WebSockets, SSE)

## Related Decisions

- ADR-0006: Adopt gRPC + Protobuf for service communication
- ADR-0001: Adopt Go 1.23 for backend services
- ADR-0009: Adopt OpenTelemetry for observability
- Usage rule: gRPC gateway configuration patterns
