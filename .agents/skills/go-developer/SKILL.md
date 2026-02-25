---
name: go-developer
description: Expert guidance for Go development, including code quality standards, testing practices, service configuration, and HTTP routing patterns.
compatibility: Requires Go runtime. Integrated with devbox for consistent environments.
---

# Go Developer Skill

This skill provides comprehensive guidance for Go developers working in this repository. It consolidates best practices, standards, and tooling for writing high-quality, maintainable Go code.

## Overview

Go development in this repository is governed by clear standards and automated enforcement through tools and usage rules. This skill integrates those standards and provides expert guidance for common development tasks.

**Key capabilities:**

- Write Go code following team standards and patterns
- Configure services with observability (logging, tracing, metrics)
- Use HTTP routing and middleware (chi framework)
- Test Go code with proper coverage and conventions
- Enforce code quality through linting and static analysis
- Debug and troubleshoot Go applications

**Key integrations:**

- [golangci-lint](#linting-with-golangci-lint) — automated code quality checks
- [Go testing](#testing-best-practices) — unit and integration test standards
- [Service defaults](#service-configuration) — observability and HTTP client setup
- [Chi framework](#http-routing-with-chi) — HTTP routing and middleware

## Development Environment

### Prerequisites

All Go development happens within a `devbox` shell to ensure consistent environments:

```bash
devbox shell
```

This provides:

- Go runtime (version pinned in `devbox.json`)
- golangci-lint for code linting
- All other development tools configured for the repository

### Verify Setup

```bash
go version
golangci-lint version
```

## Linting with golangci-lint

Code quality is enforced through [golangci-lint](../../rules/technologies/go.md#golangci-lint), a fast parallel Go linter that aggregates results from multiple linters.

### Running Linting

**Check code quality:**

```bash
golangci-lint run ./...
```

**Fix auto-fixable issues:**

```bash
golangci-lint run --fix ./...
```

**Lint a specific package:**

```bash
golangci-lint run ./cmd/myapp/...
```

### Configuration

The linter is configured via `.golangci.yml` at repository root. Key settings:

- **Presets:** `[bugs, performance, style, unused]` — run standard linters in parallel
- **Excluded paths:** Test files are excluded from certain checks (e.g., `errcheck`)
- **Custom rules:** Linter severity and behavior customizable per check

### Key Linters Enabled

- `errcheck` — detects unchecked error returns
- `ineffassign` — identifies unused assignments
- `misspell` — catches common spelling mistakes
- `vet` — Go's built-in static analysis
- `golint` — Go code style issues

### Common Issues and Fixes

**Error: "error returned but not checked"**

- Problem: Function returns error that isn't validated
- Fix: Explicitly check or ignore with `_ = functionCall()`

**Warning: "ineffectual assignment"**

- Problem: Variable assigned but not used
- Fix: Remove unused variable or use it

**Issue: "This comparison of a constant type is always true/false"**

- Problem: Logic error in conditionals
- Fix: Review conditional logic and correct

## Testing Best Practices

Go testing follows [Go testing standards](../../rules/technologies/go.md#testing) with emphasis on clarity, coverage, and maintainability.

### Test Organization

**File placement** (Go convention):

- Test files live alongside source files
- Name test files `*_test.go` (e.g., `handler_test.go` for `handler.go`)
- Tests are in the same package as the code being tested

```
src/services/user/
├── handler.go
├── handler_test.go
├── repository.go
└── repository_test.go
```

### Running Tests

**Run all tests:**

```bash
go test ./...
```

**Run tests in a specific package:**

```bash
go test ./cmd/myapp/...
```

**Run with coverage:**

```bash
go test -cover ./...
```

**Run with detailed output:**

```bash
go test -v ./...
```

**Run tests matching a pattern:**

```bash
go test -run TestHandlerLogin ./...
```

### Writing Tests

**Table-driven test pattern** (recommended):

```go
func TestUserValidation(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        wantErr bool
    }{
        {"valid email", "user@example.com", false},
        {"invalid email", "not-an-email", true},
        {"empty string", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

**What to test:**

- Happy path behavior
- Error cases and edge cases
- Boundary conditions
- Integration with dependencies (mocked)

**What NOT to test:**

- Standard library behavior (trust Go)
- Third-party library behavior (trust the library)
- Tests for tests (unless they're test helpers)

### Test Coverage

Aim for meaningful coverage:

- 80%+ coverage for critical business logic
- 50%+ coverage for supporting code
- Focus on coverage quality, not percentage

```bash
# Generate coverage report
go test -coverprofile=coverage.out ./...

# View coverage in browser
go tool cover -html=coverage.out
```

### Mocking and Test Doubles

Use interfaces for testability:

```go
// Define an interface for external dependencies
type UserRepository interface {
    GetUser(ctx context.Context, id string) (*User, error)
    SaveUser(ctx context.Context, user *User) error
}

// Implement a mock for testing
type MockUserRepository struct {
    GetUserFunc func(ctx context.Context, id string) (*User, error)
}

func (m *MockUserRepository) GetUser(ctx context.Context, id string) (*User, error) {
    if m.GetUserFunc != nil {
        return m.GetUserFunc(ctx, id)
    }
    return nil, ErrNotFound
}

// Use the mock in tests
func TestUserService(t *testing.T) {
    repo := &MockUserRepository{
        GetUserFunc: func(ctx context.Context, id string) (*User, error) {
            return &User{ID: id, Name: "Test"}, nil
        },
    }

    service := NewUserService(repo)
    // Test service behavior...
}
```

### Integration Tests

For tests that require external services:

1. Use build tags to separate integration tests:

   ```go
   //go:build integration
   package mypackage

   func TestDatabaseIntegration(t *testing.T) {
       // Requires real database
   }
   ```

2. Run integration tests explicitly:

   ```bash
   go test -tags integration ./...
   ```

3. Ensure integration tests are skipped in fast test runs:
   ```bash
   go test ./...  # Only unit tests
   ```

## Service Configuration

New Go services use the [Service Defaults](../../rules/technologies/go.md#service-defaults) package for unified observability setup (logging, tracing, metrics).

### Quick Start

**Initialize a new service with observability:**

```go
import (
    "context"
    "log/slog"
    "os"
    "github.com/staccato-toolkit/core/pkg/servicedefaults"
)

func main() {
    ctx := context.Background()

    // Initialize all observability signals (traces, metrics, logs)
    shutdown, err := servicedefaults.Configure(ctx, "my-service")
    if err != nil {
        slog.Error("failed to initialize service defaults", "error", err)
        os.Exit(1)
    }
    defer shutdown(ctx)

    // Use slog.Default() for logging (no global logger variable)
    slog.Info("service started", "port", 8080)

    // Your service logic...
}
```

### What servicedefaults.Configure() Provides

✓ Structured logging via `log/slog`  
✓ Distributed tracing (OpenTelemetry)  
✓ Metrics collection (Prometheus)  
✓ HTTP client defaults with tracing instrumentation  
✓ Graceful shutdown for all signals  
✓ Non-blocking OTLP dial (service starts even if Collector unreachable)  
✓ Environment-aware behavior (`OTEL_SDK_DISABLED=true` for dev/test)

### Logging

Use `log/slog` exclusively (no global logger variables):

```go
slog.Info("user created", "user_id", id, "email", email)
slog.Warn("high memory usage", "percent", 95)
slog.Error("database connection failed", "error", err)
```

Structured logging with key-value pairs enables filtering and correlation in observability dashboards.

### HTTP Client

Always use the HTTP client provided by servicedefaults:

```go
client := servicedefaults.NewHTTPClient()
resp, err := client.Get(ctx, "https://api.example.com/users")
```

This client automatically includes:

- OpenTelemetry instrumentation for tracing
- Proper timeout defaults
- Connection pooling

## HTTP Routing with Chi

The [Chi framework](../../rules/technologies/go.md#chi) is used for HTTP routing and middleware in this repository.

### Basic Router Setup

```go
import "github.com/go-chi/chi/v5"

func main() {
    r := chi.NewRouter()

    // Global middleware
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    // Routes
    r.Get("/", handleHome)
    r.Post("/users", handleCreateUser)
    r.Get("/users/{id}", handleGetUser)

    http.ListenAndServe(":8080", r)
}
```

### Route Organization

Group related routes using Chi's `Group` or `Route` methods:

```go
r.Route("/api/v1", func(r chi.Router) {
    r.Use(authMiddleware)

    r.Route("/users", func(r chi.Router) {
        r.Get("/", listUsers)
        r.Post("/", createUser)
        r.Get("/{id}", getUser)
        r.Put("/{id}", updateUser)
        r.Delete("/{id}", deleteUser)
    })

    r.Route("/posts", func(r chi.Router) {
        r.Get("/", listPosts)
        r.Post("/", createPost)
    })
})
```

### Middleware

Create composable middleware for cross-cutting concerns:

```go
// Custom middleware
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token == "" {
            http.Error(w, "missing authorization", http.StatusUnauthorized)
            return
        }

        // Validate token...
        next.ServeHTTP(w, r)
    })
}

// Apply to routes
r.Route("/api", func(r chi.Router) {
    r.Use(authMiddleware)
    r.Get("/protected", handleProtected)
})
```

### Path Parameters

Extract parameters from URL paths:

```go
r.Get("/users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    user, err := getUser(id)
    // Handle response...
})
```

### Request/Response Handling

Standard patterns for JSON APIs:

```go
type UserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}

type UserResponse struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

r.Post("/users", func(w http.ResponseWriter, r *http.Request) {
    var req UserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request", http.StatusBadRequest)
        return
    }

    user := createUser(req.Name, req.Email)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(UserResponse{
        ID:    user.ID,
        Name:  user.Name,
        Email: user.Email,
    })
})
```

## Code Organization

### Package Structure

- Organize code into logical packages by concern (not by type)
- Each package should have a clear, single responsibility
- Avoid circular dependencies

**Good structure:**

```
src/services/user/
├── handler.go       # HTTP handlers
├── service.go       # Business logic
├── repository.go    # Data access
├── entity.go        # Domain models
└── user_test.go     # Tests
```

**Avoid:**

```
src/
├── handlers/        # All handlers
├── services/        # All services
├── repositories/    # All repositories
```

### Naming Conventions

- **Packages:** lowercase, short, meaningful (e.g., `user`, `auth`, `storage`)
- **Types:** PascalCase (e.g., `User`, `Handler`, `Repository`)
- **Functions/Methods:** PascalCase if exported, camelCase if unexported
- **Constants:** PascalCase if exported (e.g., `DefaultTimeout`)
- **Variables:** camelCase (e.g., `userName`, `isActive`)

## Error Handling

Go emphasizes explicit error handling:

```go
// DO: Always check errors
file, err := os.Open("config.yaml")
if err != nil {
    return fmt.Errorf("failed to open config: %w", err)
}
defer file.Close()

// DON'T: Ignore errors
file, _ := os.Open("config.yaml")
defer file.Close()
```

### Custom Error Types

Define errors for specific failure modes:

```go
var (
    ErrNotFound      = errors.New("resource not found")
    ErrUnauthorized  = errors.New("unauthorized")
    ErrInvalidInput  = errors.New("invalid input")
)

// Use errors.Is for checking
if errors.Is(err, ErrNotFound) {
    http.Error(w, "not found", http.StatusNotFound)
}
```

### Error Wrapping

Use `fmt.Errorf()` with `%w` to preserve error chains:

```go
user, err := repository.GetUser(ctx, id)
if err != nil {
    return nil, fmt.Errorf("get user: %w", err)
}
```

This allows `errors.Is()` and `errors.As()` to traverse the chain.

## Debugging

### Logging for Diagnostics

Use structured logging with context:

```go
slog.Debug("processing user request",
    "user_id", userID,
    "action", "update",
    "duration_ms", elapsed,
)
```

### Delve Debugger

For interactive debugging:

```bash
# Run with debugger
dlv debug ./cmd/myapp

# Set breakpoints
(dlv) break main.main
(dlv) continue
```

## Common Workflows

### Creating a New Service

1. Create service package following [package structure](#package-structure)
2. Initialize observability with servicedefaults (see [Service Configuration](#service-configuration))
3. Set up HTTP routing with chi (see [HTTP Routing with Chi](#http-routing-with-chi))
4. Write tests alongside code (see [Testing Best Practices](#testing-best-practices))
5. Run linter: `golangci-lint run ./...`
6. Commit and submit for review

### Adding a Feature to Existing Service

1. Write test first (test-driven development)
2. Implement feature in service code
3. Run linter: `golangci-lint run --fix ./...`
4. Verify tests pass: `go test -v ./...`
5. Check coverage: `go test -cover ./...`
6. Commit with clear message

### Debugging a Test Failure

1. Run failing test with verbose output: `go test -v -run TestName ./...`
2. Add logging/debugging to understand failure
3. Check test setup and mocks are correct
4. Use delve for interactive debugging if needed: `dlv test ./...`

### Refactoring Code

1. Ensure tests are in place first
2. Make refactoring changes
3. Run tests frequently: `go test -v ./...`
4. Run linter: `golangci-lint run ./...`
5. Verify coverage doesn't decrease: `go test -cover ./...`

## Interface Development (TUI, CLI, Web/PWA)

The staccato-toolkit exposes three user-facing interfaces, each implemented as a separate Go module:

| Interface   | Module                     | Library                                                | Pattern                                   |
| ----------- | -------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Terminal UI | `src/staccato-toolkit/tui` | Bubble Tea v2 (`charm.land/bubbletea/v2`)              | Elm Architecture (Model/Init/Update/View) |
| CLI         | `src/staccato-toolkit/cli` | cobra (`github.com/spf13/cobra`)                       | Command tree with `RunE`                  |
| Web/PWA     | `src/staccato-toolkit/web` | go-app v10 (`github.com/maxence-charriere/go-app/v10`) | Go+WASM component model                   |

### Cross-Interface Evaluation Rule

> **When adding a feature to any of these three interfaces, evaluate whether the same feature should also be implemented in the other two.**

This ensures a consistent user experience regardless of how users interact with the toolkit. Apply this rule whenever:

- Adding a new command or action to the CLI
- Adding a new screen or workflow to the TUI
- Adding a new page or capability to the Web UI

**Checklist for any interface feature:**

1. Can this feature be meaningfully implemented in the CLI? (Most features should be)
2. Can this feature be meaningfully implemented in the TUI? (Consider interactive equivalents)
3. Can this feature be meaningfully implemented in the Web/PWA? (Consider visual equivalents)
4. If a feature is interface-specific (e.g., a CLI flag that doesn't translate to a visual UI), document why in the PR description.

### Bubble Tea v2 (TUI)

See [Bubble Tea usage rules](../../rules/technologies/go.md#bubble-tea-v2-tui-framework) for full guidance.

**Quick reference:**

- All state lives in the `model` struct
- `Init() tea.Cmd` — return nil for no startup command
- `Update(tea.Msg) (tea.Model, tea.Cmd)` — handle messages, return updated model
- `View() tea.View` — return `tea.NewView(content)` for rendering
- Redirect slog to stderr before `tea.NewProgram(m).Run()` to avoid stdout corruption:

```go
slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stderr, nil)))
shutdown, err := servicedefaults.Configure(ctx, "Tui")
```

### cobra (CLI)

See [cobra usage rules](../../rules/technologies/go.md#cobra) for full guidance.

**Quick reference:**

- Root command: `&cobra.Command{Use: "staccato", ...}`
- Subcommands: `rootCmd.AddCommand(newHelloCmd())`
- Use `cmd.Println` (not `fmt.Println`) in `RunE` for testability
- Test by capturing `rootCmd.SetOut(buf)` and asserting `buf.String()`

### go-app v10 (Web/PWA)

See [go-app usage rules](../../rules/technologies/go.md#go-app) for full guidance.

**Quick reference:**

- Components embed `app.Compo` and implement `Render() app.UI`
- State mutations in event handlers use `ctx.Dispatch(func(ctx app.Context) { h.field++ })`
- Build targets: `go build -o server .` (native) and `GOARCH=wasm GOOS=js go build -o web/app.wasm .` (WASM)
- `app.RunWhenOnBrowser()` is a no-op on the server; blocks in WASM

## Related Rules and Patterns

- [Go Technology Rules](../../rules/technologies/go.md) — Code quality, testing, service defaults, and HTTP routing standards
- [Function Patterns](../../rules/patterns/code/functions.md) — Function design
- [Naming Patterns](../../rules/patterns/code/naming.md) — Naming conventions

## Troubleshooting

### Import Errors

**Problem:** "package not found" error

- Solution: Run `go mod tidy` to sync `go.mod` and `go.sum`

**Problem:** Circular import error

- Solution: Restructure packages to eliminate cycles (common cause: models in handler package imports handler in model)

### Test Failures

**Problem:** Tests pass locally but fail in CI

- Solution: Check for race conditions (`go test -race ./...`), timezone assumptions, or non-deterministic behavior

**Problem:** "undefined: functionName" in tests

- Solution: Verify function is exported (capitalized) if in different package

### Build Issues

**Problem:** "go: updates to go.mod needed" during build

- Solution: Run `go mod tidy` and commit changes

**Problem:** Module version conflict

- Solution: Use `go mod graph` to visualize dependencies and `go get -u ./...` to update

## Next Steps

- Explore the related rules linked above for deeper guidance
- Review existing service code for patterns in this repository
- Start with small contributions to learn code review standards
