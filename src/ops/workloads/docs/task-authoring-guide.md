# Task Authoring Guide

This guide walks developers through adding new pipeline tasks to the Dagger platform module.

## Before You Start

- Ensure you have `devbox` installed
- Run `devbox shell` in the repository root
- Navigate to `src/ops/workloads/`
- You should be able to run `dagger call --help` to list existing tasks

## Quick Start: Adding a New Lint Task

### Step 1: Identify Your Task

Ask yourself:
- **What tool will this task run?** (e.g., `semgrep`, `trivy`, `eslint`)
- **What container image does it need?** (e.g., `semgrep/semgrep:latest`, `aquasec/trivy:latest`)
- **What is the task name?** (e.g., `Semgrep`, `Trivy`, `Eslint`)

### Step 2: Write the Method

Add a new exported method to the `Platform` type in `platform.go`:

```go
// Semgrep runs semantic code analysis using Semgrep.
func (m *Platform) Semgrep(ctx context.Context, source *Directory) (string, error) {
    container := dag.Container().
        From("semgrep/semgrep:latest").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
    
    out, err := container.
        WithExec([]string{"semgrep", "--json", "."}).
        Stdout(ctx)
    
    if err != nil {
        return fmt.Sprintf("semgrep analysis failed: %v", err), err
    }
    return out, nil
}
```

### Step 3: Test Locally

```bash
devbox shell
cd src/ops/workloads
dagger call semgrep --source ../..
```

Expected output:
- Exit code 0 (success) with JSON output
- Exit code non-zero (failure) if semgrep found issues

### Step 4: Document the Task

Add a documentation section to `docs/index.md`:

```markdown
### `semgrep`

Runs Semgrep semantic code analysis to detect complex code patterns and security issues.

**Base image**: semgrep/semgrep:latest

```bash
dagger call semgrep --source ../..
```

**Output**: JSON-formatted Semgrep findings.
```

### Step 5: Add Tests (if needed)

Create a test file `platform_semgrep_test.go`:

```go
package main

import (
    "context"
    "testing"
)

func TestSemgrep(t *testing.T) {
    ctx := context.Background()
    
    m := &Platform{}
    output, err := m.Semgrep(ctx, ...)
    
    // Assert: error is nil for clean code
    // Assert: output contains expected format
}
```

### Step 6: Create an OpenSpec Task

If this task is part of a larger feature, create a task in the corresponding OpenSpec change:

```bash
td create "Implement: Semgrep integration" \
  --type task \
  --parent <spec-feature-id> \
  --body "Add Semgrep security scanning task to Platform module"
```

Link the task to your work:
```bash
td link <task-id> platform.go --role implementation
```

---

## Pattern: Lint Task

Most lint tasks follow this pattern:

```go
// TaskName runs <tool> against the source directory.
func (m *Platform) TaskName(ctx context.Context, source *Directory) (string, error) {
    // Optional: Check for config file
    container := dag.Container().
        From("base-image:tag").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
    
    // Execute the tool
    out, err := container.
        WithExec([]string{"tool", "arg1", "arg2", "."}).
        Stdout(ctx)
    
    if err != nil {
        return fmt.Sprintf("tool execution failed: %v", err), err
    }
    return out, nil
}
```

### Lint Task Checklist

- [ ] Method name is CapitalCase (e.g., `Eslint`)
- [ ] Signature is `(ctx context.Context, source *Directory) (string, error)`
- [ ] Container base image is appropriate for the tool
- [ ] Tool is invoked with standard output format (JSON, text, etc.)
- [ ] Error handling includes diagnostics
- [ ] Documentation includes base image and invocation example
- [ ] Task is added to `docs/index.md`

---

## Pattern: Test Task

Test tasks are similar but often handle multi-module workspaces:

```go
// Test runs the test suite.
func (m *Platform) Test(ctx context.Context, source *Directory) (string, error) {
    container := dag.Container().
        From("golang:1.23-alpine").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
    
    // Check for go.work (multi-module)
    _, err := container.WithExec([]string{"test", "-f", "go.work"}).Sync(ctx)
    if err == nil {
        // Multi-module: run tests per-module
        modules := []string{"src/module1", "src/module2"}
        var results []string
        for _, mod := range modules {
            out, testErr := container.
                WithWorkdir("/src/" + mod).
                WithExec([]string{"go", "test", "./..."}).
                Stdout(ctx)
            if testErr != nil {
                return fmt.Sprintf("tests failed in %s: %v", mod, testErr), testErr
            }
            results = append(results, fmt.Sprintf("%s: ok\n%s", mod, out))
        }
        return strings.Join(results, "\n"), nil
    }
    
    // Single-module: run tests on root
    out, err := container.WithExec([]string{"go", "test", "./..."}).Stdout(ctx)
    if err != nil {
        return fmt.Sprintf("test execution failed: %v", err), err
    }
    return out, nil
}
```

### Test Task Checklist

- [ ] Detects single-module vs. multi-module layout
- [ ] Returns clear error messages with module names
- [ ] Test output is parseable (test count, pass/fail summary)
- [ ] Exit code reflects test results (0 = all pass, non-zero = any failure)

---

## Pattern: Build Task

Build tasks produce or validate artifacts:

```go
// Build compiles the project.
func (m *Platform) Build(ctx context.Context, source *Directory) (string, error) {
    container := dag.Container().
        From("golang:1.23-alpine").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
    
    out, err := container.
        WithExec([]string{"go", "build", "-o", "/tmp/app", "./cmd/app"}).
        Stdout(ctx)
    
    if err != nil {
        return fmt.Sprintf("build failed: %v", err), err
    }
    return fmt.Sprintf("build successful: %s", out), nil
}
```

### Build Task Checklist

- [ ] Validates the build succeeds
- [ ] Returns clear success/failure message
- [ ] Handles multi-language projects (if applicable)
- [ ] Build artifacts are optional (task reports success/failure, not artifact location)

---

## Advanced: Passing Data Between Tasks

Currently, tasks return strings. To pass data between tasks:

1. **File-based**: Write output to a mounted directory
   ```go
   // Task 1: Generate
   func (m *Platform) Generate(ctx context.Context, source *Directory) (string, error) {
       // ... generate code ...
       return "code generated to src/generated/", nil
   }
   
   // Task 2: Test generated code
   // Generated files are already in source tree; next task sees them
   ```

2. **Shell-based composition**: Use shell commands to chain tasks
   ```bash
   dagger call generate --source . && dagger call test --source .
   ```

3. **Future**: Dagger's type system may support first-class composition (TBD)

---

## Best Practices

### 1. Use Alpine-based Images

Alpine images are minimal and fast to pull:
```go
From("golang:1.23-alpine")       // Good
From("golang:1.23-bullseye")     // Also fine (larger)
From("ubuntu:22.04")              // Avoid (large, slower)
```

### 2. Cache Dependencies

Dagger automatically caches dependencies. To maximize cache hits:
- Use the same base image version across tasks
- Let Dagger handle dependency installation (don't try to optimize manually)

### 3. Readable Error Messages

Include context in error messages:
```go
// Good
return fmt.Sprintf("linting failed in src/main.go: %v", err), err

// Avoid
return "error", err
```

### 4. Graceful Degradation

If a tool is optional, allow the task to succeed if it's not found:
```go
// If tool not configured, exit with code 0
if !hasToolConfig {
    return "tool not configured (skipped)", nil
}
```

### 5. Document Each Task

Always add a section to `docs/index.md`:
```markdown
### `task-name`

Brief description of what the task does.

**Base image**: image:tag

**Invocation**:
```bash
dagger call task-name --source ../..
```

**Output**: Description of output format and content.
```

### 6. Test Locally Before Committing

Always run the task locally to verify it works:
```bash
devbox shell
cd src/ops/workloads
dagger call your-task --source ../..
```

---

## Troubleshooting

### "dagger call: command not found"

**Problem**: Dagger is not installed or not in PATH.

**Solution**: Run `devbox shell` first.

### "no such file or directory"

**Problem**: Wrong path in `WithMountedDirectory()` or `WithWorkdir()`.

**Solution**: 
- Use `/src` as the base path (the source directory mount point)
- Verify paths with `ls` before running commands

### "exit code 127: command not found"

**Problem**: Tool is not installed in the container image or has a different name.

**Solution**:
- Check the tool name (e.g., `golangci-lint` vs. `golint`)
- Verify the base image includes the tool
- Add installation step if needed: `.WithExec([]string{"apk", "add", "tool"})`

### Task runs locally but fails in CI

**Problem**: Environment differences (network, secrets, etc.).

**Solution**:
- Secrets: Pass via GitHub Actions workflow
- Network: Use a base image with required tools pre-installed
- Check for hardcoded paths or host-specific assumptions

---

## Example: Full Task Implementation

Here's a complete example implementing a TypeScript/JavaScript linting task:

```go
// Eslint runs ESLint static analysis on JavaScript/TypeScript files.
func (m *Platform) Eslint(ctx context.Context, source *Directory) (string, error) {
    // Check for .eslintrc or eslint.config.js
    eslintConfigs := []string{
        ".eslintrc",
        ".eslintrc.js",
        ".eslintrc.json",
        "eslint.config.js",
    }
    
    container := dag.Container().
        From("node:20-alpine").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src")
    
    // Check for ESLint configuration
    for _, cfg := range eslintConfigs {
        _, err := container.WithExec([]string{"test", "-f", cfg}).Sync(ctx)
        if err == nil {
            // Config found, run ESLint
            out, lintErr := container.
                WithExec([]string{"npm", "install", "-g", "eslint"}).
                WithExec([]string{"eslint", "--format", "json", "."}).
                Stdout(ctx)
            
            if lintErr != nil {
                return fmt.Sprintf("ESLint failed: %v", lintErr), lintErr
            }
            return out, nil
        }
    }
    
    return "no ESLint configuration found", nil
}
```

**Steps to use this task**:
1. Add the method to `platform.go`
2. Test: `dagger call eslint --source ../..`
3. Document in `docs/index.md`
4. Commit and push
5. Task is automatically available in CI via `.github/workflows/ci.yml`

---

## Getting Help

- **Dagger Documentation**: https://docs.dagger.io/
- **Go SDK Guide**: https://docs.dagger.io/sdk/go
- **Platform Workloads Repo**: `src/ops/workloads/`
- **OpenSpec Specifications**:
  - `openspec/specs/dagger-module-and-tasks/spec.md`
  - `openspec/specs/dagger-github-actions/spec.md`
  - `openspec/changes/adopt-dagger-ci-cd/specs/dagger-pipeline-usage-rules/spec.md`
- **Platform Pattern Rule**: `.opencode/rules/patterns/delivery/dagger-ci-cd.md`

