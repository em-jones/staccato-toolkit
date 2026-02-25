---
created-by-change: technology-audit
last-validated: 2026-02-25
---

# RPC Usage Rules (gRPC + Protocol Buffers)

gRPC and Protocol Buffers are the standard stack for service-to-service communication in this platform. All internal service communication MUST use gRPC for type safety, performance, and built-in features (streaming, deadlines, retries). Use HTTP/REST for external APIs and browser clients only.

## Table of Contents

- [Protocol Buffers](#protocol-buffers)
  - [Core Principle](#core-principle)
  - [Setup](#setup)
  - [Key Guidelines](#key-guidelines)
  - [Common Issues](#common-issues)
- [gRPC](#grpc)
  - [Core Principle](#core-principle-1)
  - [Setup](#setup-1)
  - [Key Guidelines](#key-guidelines-1)
  - [Common Issues](#common-issues-1)
- [See Also](#see-also)

---

## Protocol Buffers

Protocol Buffers (protobuf) is a language-neutral, platform-neutral mechanism for serializing structured data. It is the standard interface definition language (IDL) for gRPC services and cross-service contracts in this platform.

### Core Principle

Protocol Buffers define all gRPC service contracts. All `.proto` files MUST use proto3 syntax, follow naming conventions (PascalCase for messages, snake_case for fields), and be versioned (e.g., `myservice.v1`). Proto files MUST be stored in a shared repository for cross-team consumption.

### Setup

Install Protocol Buffers compiler:

```bash
# macOS
brew install protobuf

# Verify installation
protoc --version
```

Install Go code generators:

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

### Key Guidelines

#### Use proto3 syntax

All `.proto` files MUST use proto3:

```protobuf
// ✓ Good: proto3 syntax
syntax = "proto3";
package myservice.v1;

message User {
  string user_id = 1;
  string email = 2;
  int64 created_at = 3;
}
```

#### Follow naming conventions

Use consistent naming for messages, fields, and services:

```protobuf
// ✓ Good: PascalCase for messages, snake_case for fields
message UserProfile {
  string user_id = 1;
  string display_name = 2;
  int32 age_years = 3;
}

// ✓ Good: PascalCase for services and RPCs
service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}
```

#### Version your proto packages

Use versioned package names for API evolution:

```protobuf
// ✓ Good: Versioned package
syntax = "proto3";
package myservice.v1;

// When breaking changes needed, create v2
package myservice.v2;
```

#### Reserve field numbers for deleted fields

Prevent field number reuse when removing fields:

```protobuf
// ✓ Good: Reserve deleted field numbers
message User {
  reserved 2, 4;  // Removed fields
  reserved "old_field_name";

  string user_id = 1;
  string email = 3;
  int64 created_at = 5;
}
```

#### Generate code with consistent commands

Use a Makefile or script for consistent code generation:

```makefile
# ✓ Good: Consistent proto generation
.PHONY: proto
proto:
	protoc --go_out=. --go-grpc_out=. \
	  --go_opt=paths=source_relative \
	  --go-grpc_opt=paths=source_relative \
	  proto/**/*.proto
```

### Common Issues

**"protoc command not found"**
→ Install the Protocol Buffers compiler: `brew install protobuf` or download from GitHub releases.

**"Generated code import errors"**
→ Ensure `protoc-gen-go` and `protoc-gen-go-grpc` are in PATH. Run `go install` commands to install generators.

**"Field number conflicts"**
→ Each field MUST have a unique number. Use `reserved` for deleted fields to prevent reuse.

**"Breaking changes break existing clients"**
→ Never change field numbers or types. Use new field numbers for changes. Consider creating a new package version (v2) for major changes.

---

## gRPC

gRPC is a high-performance, open-source RPC framework using HTTP/2 and Protocol Buffers.

### Core Principle

gRPC is the standard for service-to-service communication. All gRPC services MUST define APIs using Protocol Buffers (`.proto` files), generate strongly-typed clients/servers, and integrate with OpenTelemetry for distributed tracing. Use HTTP/REST for external APIs and browser clients.

### Setup

Install gRPC for Go services:

```bash
go get google.golang.org/grpc
go get google.golang.org/protobuf
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

Basic gRPC server in Go:

```go
import (
    "google.golang.org/grpc"
    pb "github.com/example/service/proto"
)

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterMyServiceServer(s, &server{})
    s.Serve(lis)
}
```

### Key Guidelines

#### Define APIs with Protocol Buffers

All gRPC APIs MUST be defined in `.proto` files:

```protobuf
// ✓ Good: Well-defined gRPC service
syntax = "proto3";
package myservice.v1;

service MyService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}

message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  User user = 1;
}
```

#### Use OpenTelemetry interceptors for tracing

Integrate gRPC with OpenTelemetry for automatic trace propagation:

```go
import (
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
)

// Server with OTel interceptor
s := grpc.NewServer(
    grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor()),
    grpc.StreamInterceptor(otelgrpc.StreamServerInterceptor()),
)

// Client with OTel interceptor
conn, _ := grpc.Dial(target,
    grpc.WithUnaryInterceptor(otelgrpc.UnaryClientInterceptor()),
    grpc.WithStreamInterceptor(otelgrpc.StreamClientInterceptor()),
)
```

#### Set deadlines for all client calls

Always set deadlines (timeouts) for gRPC client calls:

```go
// ✓ Good: Set deadline for client call
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

resp, err := client.GetUser(ctx, &pb.GetUserRequest{UserId: "123"})
```

#### Use streaming for large datasets

Use server/client/bidirectional streaming for large or continuous data:

```protobuf
// ✓ Good: Server streaming for large results
rpc ListUsers(ListUsersRequest) returns (stream User);

// ✓ Good: Bidirectional streaming for real-time communication
rpc Chat(stream ChatMessage) returns (stream ChatMessage);
```

### Common Issues

**"gRPC calls fail with deadline exceeded"**
→ Increase the client timeout or optimize the server handler. Check for network latency or slow database queries.

**"Missing trace context in gRPC calls"**
→ Ensure OTel interceptors are registered on both client and server. Verify `otelgrpc` is imported and configured.

**"Proto compilation errors"**
→ Run `protoc` with correct flags: `protoc --go_out=. --go-grpc_out=. proto/*.proto`. Ensure `protoc-gen-go` and `protoc-gen-go-grpc` are installed.

---

## See Also

- [OpenTelemetry Usage Rules](./opentelemetry.md) - Distributed tracing
- [API Design Patterns](../patterns/architecture/api-design.md) - API design standards
- [Protocol Buffers Documentation](https://protobuf.dev/) - Official protobuf docs
