---
created-by-change: legacy
last-validated: 2026-02-25
---

# Dagger Usage Rules

Dagger is a programmable platform for automating software delivery. It provides a containerized execution engine with SDKs in multiple languages for building, testing, and deploying applications. Dagger runs locally, in CI, or directly in the cloud with only a container runtime dependency. **This platform uses the Go SDK exclusively.**

## Table of Contents

- [Core Concepts](#core-concepts)
- [Go SDK Setup](#go-sdk-setup)
- [Go SDK Examples](#go-sdk-examples)
  - [Basic function with arguments](#basic-function-with-arguments)
  - [Container and directory operations](#container-and-directory-operations)
  - [Services (test databases, mock servers)](#services-test-databases-mock-servers)
  - [Secrets](#secrets)
  - [Caching](#caching)
  - [Function caching annotations](#function-caching-annotations)
  - [Constructors and function chaining](#constructors-and-function-chaining)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)
- [CLI Commands](#cli-commands)
- [See Also](#see-also)

## Core Concepts

- **Container**: Encapsulates container operations with state and methods
- **Directory**: Filesystem directory operations
- **File**: Individual file operations
- **Service**: Ephemeral network services for testing (databases, APIs, mock servers)
- **Secret**: Secure credential management with no plaintext exposure
- **CacheVolume**: Persistent filesystem caching across workflow runs
- **Functions**: Basic computation units that accept inputs and return outputs; run in sandboxed containers
- **Modules**: Package and share Dagger Functions for reusability; searchable from Daggerverse

## Go SDK Setup

```bash
# Install SDK
go get dagger.io/dagger@latest
go mod tidy

# Create new module
dagger init --sdk=go --name=my-module

# Setup/update module resources
dagger develop --sdk=go
```

Module structure:

```
.
├── dagger.gen.go
├── go.mod
├── go.sum
├── internal/
│   ├── dagger/           # Generated Dagger API types
│   ├── querybuilder/
│   └── telemetry/
├── main.go               # Your module code
└── dagger.json           # Module configuration
```

## Go SDK Examples

### Basic function with arguments

```go
// String argument
func (m *MyModule) GetUser(ctx context.Context, gender string) (string, error) {
    return dag.Container().
        From("alpine:latest").
        WithExec([]string{"apk", "add", "curl", "jq"}).
        WithExec([]string{"sh", "-c", fmt.Sprintf("curl https://randomuser.me/api/?gender=%s | jq -r '.results[0].name'", gender)}).
        Stdout(ctx)
}

// Optional argument with default
// +default="world"
func (m *MyModule) Hello(name string) string {
    return fmt.Sprintf("Hello, %s", name)
}
```

Call with: `dagger call get-user --gender=male`

### Container and directory operations

```go
// Directory as argument and return
func (m *MyModule) GoBuilder(src *dagger.Directory, arch string, os string) *dagger.Directory {
    return dag.Container().
        From("golang:latest").
        WithMountedDirectory("/src", src).
        WithWorkdir("/src").
        WithEnvVariable("GOARCH", arch).
        WithEnvVariable("GOOS", os).
        WithEnvVariable("CGO_ENABLED", "0").
        WithExec([]string{"go", "build", "-o", "build/"}).
        Directory("/src/build")
}
```

Call with: `dagger call go-builder --src=. --arch=amd64 --os=linux`

### Services (test databases, mock servers)

```go
func (m *MyModule) Test(ctx context.Context, source *dagger.Directory) (string, error) {
    postgres := dag.Container().
        From("postgres:16").
        WithEnvVariable("POSTGRES_PASSWORD", "postgres").
        WithExposedPort(5432).
        AsService()

    return dag.Container().
        From("golang:1.21").
        WithServiceBinding("postgres", postgres).
        WithMountedDirectory("/src", source).
        WithWorkdir("/src").
        WithExec([]string{"go", "test", "./..."}).
        Stdout(ctx)
}
```

### Secrets

```go
func (m *MyModule) GithubApi(ctx context.Context, token *dagger.Secret) (string, error) {
    return dag.Container().
        From("alpine:latest").
        WithExec([]string{"apk", "add", "curl"}).
        WithSecretVariable("GITHUB_API_TOKEN", token).
        WithExec([]string{"sh", "-c", `curl "https://api.github.com/repos/dagger/dagger/issues" --header "Authorization: Bearer $GITHUB_API_TOKEN"`}).
        Stdout(ctx)
}
```

Call with: `dagger call github-api --token=env://GITHUB_API_TOKEN`

### Caching

```go
func (m *MyModule) Env(ctx context.Context) *dagger.Container {
    aptCache := dag.CacheVolume("apt-cache")
    return dag.Container().
        From("debian:latest").
        WithMountedCache("/var/cache/apt/archives", aptCache).
        WithExec([]string{"apt-get", "update"}).
        WithExec([]string{"apt-get", "install", "--yes", "maven"})
}
```

### Function caching annotations

```go
// Default caching (7 days TTL)
func (Tokens) AlwaysCached() string { return rand.Text() }

// TTL caching (10 seconds)
// +cache="10s"
func (Tokens) ShortLived() string { return rand.Text() }

// Never cache
// +cache="never"
func (Tokens) NoCache() string { return rand.Text() }
```

### Constructors and function chaining

```go
type MyModule struct {
    Greeting string
    Name     string
}

func (m *MyModule) WithGreeting(greeting string) *MyModule {
    m.Greeting = greeting
    return m
}

func (m *MyModule) WithName(name string) *MyModule {
    m.Name = name
    return m
}

func (m *MyModule) Message() string {
    return fmt.Sprintf("%s, %s!", m.Greeting, m.Name)
}
```

Call with: `dagger call with-greeting --greeting=Hello with-name --name=World message`

## Best Practices

**Module Design:**
- Single responsibility: one module = one cohesive capability
- Explicit dependencies: declare all host resources as function arguments
- Idempotent functions: safe to re-run without side effects
- Add GoDoc comments; they become function help text

**Security:**
- Functions have no direct host access; explicitly pass all inputs
- Use `Secret` type for credentials (never logged/cached in plaintext)
- Use images from trusted registries

**Caching Optimization:**
- Mount cache volumes for package managers at standard paths
- Use specific base image tags (not `latest`)
- Order operations from least-to-most frequently changed

**Go-Specific:**
- Run `go mod tidy` after adding dependencies
- Use Go workspaces for multi-module projects
- Don't edit generated code in `internal/` directories
- Use `+default` and `+optional` pragmas for better UX

## Common Pitfalls

- **Assuming Host Access**: Must explicitly pass host directories/files as arguments
- **Ignoring Return Types**: Each function returns a specific type
- **Overusing `latest` Tags**: Breaks layer cache stability
- **Editing Generated Code**: Files in `internal/` are auto-generated
- **Forgetting Context**: Most operations require `context.Context`

**Troubleshooting:**
- Build errors: run `go mod tidy` and `dagger develop`
- Function not found: run `dagger functions` to list available
- Slow execution: check cache hit rates; ensure cache volumes mounted
- Type errors: check function signatures with `dagger functions <name> --help`

**When NOT to use Dagger:**
- Static YAML pipelines are sufficient
- No container runtime available
- Existing mature pipeline with no extensibility needs

## CLI Commands

```bash
# Module management
dagger init --sdk=go --name=my-module
dagger develop --sdk=go

# Function execution
dagger call <function-name> [arguments]
dagger -m <module-ref> call <function>

# Checks
dagger check
dagger check <pattern>

# Introspection
dagger functions
dagger functions --help

# CI/CD
dagger run <command>
```

## See Also

- [CI/CD Pattern Rules](../patterns/delivery/ci-cd.md) - CI/CD automation patterns
- [Devops Automation Skill](../../skills/devops-automation/SKILL.md) - Dagger CI/CD workflows
- [Dagger Documentation](https://docs.dagger.io/) - Official Dagger docs
- [Go Usage Rules](./go.md) - Go SDK patterns used in Dagger modules
