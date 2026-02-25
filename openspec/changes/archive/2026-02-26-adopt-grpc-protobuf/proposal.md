---
td-board: adopt-grpc-protobuf
td-issue: td-b199d9
---

# Proposal: Adopt gRPC, Protobuf, and Code Generation Tools

## Why

The OpenSpec platform uses undocumented RPC and code generation technologies (gRPC v1.78.0, protobuf, genqlient v0.8.1, gqlparser/v2) across service definitions and tooling. Without documented adoption patterns, usage rules, and code generation practices, maintainers lack guidance on schema management, service boundaries, and code generation strategy—leading to inconsistent implementations and increased onboarding friction.

## What Changes

- Document gRPC adoption rationale and when to use gRPC vs. other RPC patterns
- Create protobuf schema management rules and version strategy
- Define code generation practices for genqlient (GraphQL client generation)
- Establish best practices for gqlparser usage in code analysis
- Create usage rules ensuring consistent service definition patterns across the codebase

## Capabilities

### New Capabilities

- `grpc-service-definitions`: Define gRPC service patterns, message structure conventions, and proto file organization
- `protobuf-schema-management`: Manage protobuf versioning, backward compatibility, and schema evolution
- `code-generation-strategy`: Configure and manage genqlient for GraphQL client generation and gqlparser integration

### Modified Capabilities

None

## Impact

- Affected services/modules: Service definitions, generated client code, GraphQL tooling
- API changes: None (documentation only)
- Data model changes: None
- Dependencies: google.golang.org/grpc v1.78.0, protobuf, github.com/Khan/genqlient v0.8.1, github.com/vektah/gqlparser/v2
