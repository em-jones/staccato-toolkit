---
name: devops-automation
description: Guide for managing and maintaining dagger CI/CD tooling in this repository. Use when adding, modifying, or running dagger tasks.
compatibility: Requires dagger CLI and devbox. Go dagger module.
---

# DevOps Automation Skill

This skill guides developers and agents in managing the dagger-based CI/CD tooling for this repository.

## Overview

This repository uses [dagger](https://dagger.io) to provide portable, reproducible CI/CD pipeline execution. Dagger tasks run in containers and behave identically on a developer laptop and in GitHub Actions.

**Key capabilities:**
- Add new CI/CD tasks as Go methods on the Platform struct
- Run any pipeline step locally with `dagger call <task>`
- Modify or remove existing tasks
- Test task logic with unit and integration tests

**Technology stack:**
- Dagger Go SDK
- Go runtime (provided by devbox)
- GitHub Actions integration via `dagger-for-github` action

## Directory Layout

The dagger module lives under the `src/ops/platform/` directory. All dagger-related code is self-contained within this directory.

```
src/ops/platform/             # dagger module root (Go SDK)
├── dagger.json               # dagger module manifest
├── go.mod                    # Go module file
├── go.sum                    # Go module checksums
├── main.go                   # module entry point; exports all task functions
├── dagger.gen.go             # auto-generated dagger bindings (do not edit)
├── platform_test.go          # Go unit tests (alongside source, Go convention)
└── tests/
    └── integration_test.go   # //go:build integration (requires Docker)
```

**Key files:**
- `dagger.json` — dagger module manifest; declares module name and SDK version
- `main.go` — entry point; **all task methods are defined on the Platform struct** — this is where you add new tasks
- `go.mod` / `go.sum` — Go module dependencies; managed by `go mod` commands
- `dagger.gen.go` — auto-generated dagger SDK bindings; **do not edit manually**
- `*_test.go` — Go unit tests; live alongside source files per Go conventions

Per [repository-layout pattern](../../rules/patterns/architecture/repository-layout.md), the dagger module is a self-contained component with its own `go.mod` and no shared source files with other components.

## Running Locally

All dagger tasks can be run locally from within a `devbox shell`. No additional setup is required beyond entering the devbox environment.

### Prerequisites

1. Ensure you are in a devbox shell:
   ```bash
   devbox shell
   ```

2. The `dagger` CLI is available in devbox — verify with:
   ```bash
   dagger version
   ```

### Running a Task

From the repository root, invoke any task using `dagger call`:

```bash
dagger call <task-name>
```

**Examples:**
```bash
# Run linting
dagger call lint

# Run tests
dagger call test

# Run build
dagger call build
```

### Viewing Available Tasks

List all available tasks in the dagger module:

```bash
dagger functions
```

This shows all exported methods from the `Platform` struct in `main.go`.

## Adding a Task

Follow these steps to add a new dagger task to the module.

### Step 1: Add the Task Method

Edit `src/ops/platform/main.go` and add a new exported method on the `Platform` struct:

```go
// MyNewTask performs a specific CI/CD operation.
// Brief description of what this task does.
func (m *Platform) MyNewTask(ctx context.Context, source *dagger.Directory) (string, error) {
    return dag.Container().
        From("alpine:latest").
        WithExec([]string{"echo", "Hello from my new task"}).
        Stdout(ctx)
}
```

**Naming conventions** (per [naming pattern](../../rules/patterns/code/naming.md)):
- Use PascalCase for exported method names: `MyNewTask`, `RunLint`, `BuildImage`
- Name after the action performed, not the implementation: `Test` not `RunGoTest`
- Keep names concise but unambiguous
- Exported methods (starting with capital letter) become dagger tasks

**Method design** (per [functions pattern](../../rules/patterns/code/functions.md)):
- Each task method does one thing
- Accept `context.Context` as first parameter for cancellation support
- Return `(result, error)` — use Go's standard error handling
- Input validation can be a separate pure function (testable without dagger engine)

### Step 2: Write Unit Tests

Create or update a test file alongside your source (Go convention):

```go
// src/ops/platform/platform_test.go
package main

import (
    "testing"
)

func TestValidateMyNewTaskInput(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        wantErr bool
    }{
        {"valid input", "valid-value", false},
        {"invalid input", "", true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validateMyNewTaskInput(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("validateMyNewTaskInput() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

**Test pure logic only** — unit tests should not invoke the dagger engine. Extract input validation and result handling into pure functions and test those.

### Step 3: Write Integration Tests (Optional)

If the task has complex container orchestration, add an integration test in a separate directory with a build tag:

```go
// src/ops/platform/tests/platform_integration_test.go
//go:build integration

package tests

import (
    "context"
    "testing"
)

func TestMyNewTaskIntegration(t *testing.T) {
    ctx := context.Background()
    // Create Platform instance and test real dagger execution
    // This requires Docker to be running
    
    result, err := platform.MyNewTask(ctx, nil)
    if err != nil {
        t.Fatalf("MyNewTask failed: %v", err)
    }
    
    if !strings.Contains(result, "expected output") {
        t.Errorf("unexpected output: %s", result)
    }
}
```

**Integration tests require Docker** — they invoke the real dagger engine. Use the `//go:build integration` build tag so they only run when explicitly requested.

### Step 4: Add GitHub Actions Workflow Job

Edit `.github/workflows/ci.yml` and add a new job for your task:

```yaml
my-new-task:
  name: My New Task
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Set up Dagger
      uses: dagger/dagger-for-github@v6
      with:
        version: "latest"
    
    - name: Run my new task
      run: dagger call my-new-task
      working-directory: ./src/ops/platform
```

**Job ordering:** Use `needs:` to declare dependencies between jobs if your task depends on another (e.g., `build` depends on `lint` and `test` passing).

### Step 5: Verify Locally

Before committing, verify the task works locally:

```bash
devbox shell
dagger call my-new-task
```

Ensure:
- The task exits with code 0 on success
- Output is as expected
- Unit tests pass: `cd src/ops/platform && go test ./...`

### Step 6: Update This Skill Documentation

If the new task introduces a new workflow or pattern, update this SKILL.md file to document it. Add an example to the "Running Locally" section if the task has non-obvious usage.

## Modifying a Task

To change the behavior of an existing task:

### Step 1: Update the Task Method

Edit `src/ops/platform/main.go` and modify the method implementation.

### Step 2: Update Unit Tests

Update or add tests in `src/ops/platform/*_test.go` files to cover the new behavior. Ensure all existing tests still pass or are updated to reflect the intentional behavior change.

### Step 3: Update Integration Tests

If the task has integration tests under `src/ops/platform/tests/`, update them to match the new behavior.

### Step 4: Verify Locally

Run the task locally to confirm the change:

```bash
devbox shell
dagger call <task-name>
```

Run all tests:

```bash
cd src/ops/platform
go test ./...
```

### Step 5: Verify CI

If the task is used in `.github/workflows/ci.yml`, ensure the workflow job still passes. Check the GitHub Actions logs after pushing your branch.

## Removing a Task

To remove a task that is no longer needed:

### Step 1: Remove the Task Method

Delete the exported method from `src/ops/platform/main.go`.

### Step 2: Remove Tests

Delete the corresponding test code:
- Remove test functions from `src/ops/platform/*_test.go` files
- Remove integration test file `src/ops/platform/tests/<task-name>_integration_test.go` (if present)

### Step 3: Remove Workflow Job

Edit `.github/workflows/ci.yml` and remove the job that invokes the deleted task.

**Update job dependencies:** If other jobs have `needs: [deleted-task-name]`, remove that dependency or replace it with the appropriate alternative.

### Step 4: Update Documentation

Remove any references to the deleted task from this SKILL.md file.

### Step 5: Verify

Ensure no other code references the deleted task:

```bash
# Search for references
rg '<task-name>' --type go --type yaml
```

Run remaining tests to ensure nothing broke:

```bash
cd src/ops/platform
go test ./...
```

## Testing

### Unit Tests

Unit tests live alongside source files as `*_test.go` files and test pure functions without invoking the dagger engine.

**Run unit tests:**
```bash
cd src/ops/platform
go test ./...
```

**What to test:**
- Input validation logic
- Argument construction for container commands
- Result parsing and error handling

**What NOT to test in unit tests:**
- Container execution (use integration tests)
- Dagger engine behavior (trust the dagger SDK)

### Integration Tests

Integration tests live under `src/ops/platform/tests/` with the `//go:build integration` build tag. They invoke the real dagger engine and require Docker to be available.

**Run integration tests:**
```bash
cd src/ops/platform
go test -tags integration ./...
```

**What to test:**
- End-to-end task execution with real containers
- Multi-container orchestration
- Edge cases that require real environment (filesystem, network)

**Build tag usage:** The `//go:build integration` tag ensures these tests only run when explicitly requested, preventing failures when Docker is unavailable.

### Running All Tests

```bash
cd src/ops/platform
go test ./...                        # unit tests only
go test -tags integration ./...      # unit + integration tests
```

Unit tests run by default. Integration tests require the `-tags integration` flag and a running Docker daemon.

## Common Patterns

### Passing Secrets to Tasks

Use dagger's secret API to pass sensitive values:

```go
// DeployWithSecret demonstrates secret handling in dagger.
func (m *Platform) DeployWithSecret(ctx context.Context, token *dagger.Secret) (string, error) {
    return dag.Container().
        From("alpine:latest").
        WithSecretVariable("TOKEN", token).
        WithExec([]string{"sh", "-c", "echo Token length: ${#TOKEN}"}).
        Stdout(ctx)
}
```

In GitHub Actions, pass secrets via the `--secret` flag:

```yaml
deploy-with-secret:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Set up Dagger
      uses: dagger/dagger-for-github@v6
      with:
        version: "latest"
    - name: Deploy
      run: dagger call deploy-with-secret --token=env:DEPLOY_TOKEN
      working-directory: ./src/ops/platform
      env:
        DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

### Caching Dependencies

Use dagger's caching primitives to speed up repeated builds:

```go
// BuildWithCache demonstrates dependency caching in dagger.
func (m *Platform) BuildWithCache(ctx context.Context, source *dagger.Directory) (string, error) {
    goCache := dag.CacheVolume("go-build-cache")
    goModCache := dag.CacheVolume("go-mod-cache")
    
    return dag.Container().
        From("golang:1.22-alpine").
        WithDirectory("/app", source).
        WithMountedCache("/go/pkg/mod", goModCache).
        WithMountedCache("/root/.cache/go-build", goCache).
        WithWorkdir("/app").
        WithExec([]string{"go", "mod", "download"}).
        WithExec([]string{"go", "build", "-o", "app", "."}).
        Stdout(ctx)
}
```

### Multi-Stage Tasks

Break complex tasks into multiple methods and compose them:

```go
// BuildImage runs lint, test, and build in sequence.
func (m *Platform) BuildImage(ctx context.Context, source *dagger.Directory) (string, error) {
    // Run lint
    lintResult, err := m.Lint(ctx, source)
    if err != nil {
        return "", fmt.Errorf("lint failed: %w", err)
    }
    
    // Run tests
    testResult, err := m.Test(ctx, source)
    if err != nil {
        return "", fmt.Errorf("tests failed: %w", err)
    }
    
    // Build
    return m.Build(ctx, source)
}
```

## Troubleshooting

### "dagger: command not found"

You are not in a devbox shell. Run:

```bash
devbox shell
```

### "Cannot connect to Docker daemon"

Dagger requires Docker to be running. Start Docker and try again.

On Linux, ensure your user is in the `docker` group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Task fails in CI but works locally

Check for environment differences:
- Are secrets available in CI? (Check GitHub Actions secrets configuration)
- Does the task depend on local files not committed to git?
- Is the base container image the same version?

Add logging to the task method to diagnose:

```go
fmt.Fprintf(os.Stderr, "Debug: inspecting environment\n")
```

### Integration tests fail with "Docker not available"

This is expected if Docker is not running. Integration tests use the `//go:build integration` build tag, so they only run when explicitly requested with `go test -tags integration`.

If you need to skip tests conditionally within an integration test:

```go
func TestIntegrationTask(t *testing.T) {
    // Check if Docker is available
    cmd := exec.Command("docker", "info")
    if err := cmd.Run(); err != nil {
        t.Skip("Docker not available, skipping integration test")
    }
    
    // Test implementation...
}
```

## See Also

- [Repository Layout Pattern](../../rules/patterns/architecture/repository-layout.md) — where dagger module fits in the repository structure
- [Functions Pattern](../../rules/patterns/code/functions.md) — how to write task functions
- [CI/CD Pattern](../../rules/patterns/delivery/ci-cd.md) — GitHub Actions integration conventions
- [Dagger Documentation](https://docs.dagger.io) — official dagger SDK reference

---

## GitOps Bootstrap via OCI Source

The platform uses an OCI-based GitOps bootstrap where CI renders manifests as OCI artifacts
pushed to an in-cluster Harbor registry. Flux reconciles from Harbor, NOT from a Git repository.

This replaces the previous Gitea-based GitRepository source (`flux-local-bootstrap` — superseded).

### Bootstrap Architecture

```
CI pipeline
  └─ renders manifests
  └─ flux push artifact → Harbor OCI registry
                              ↓
                    Flux OCIRepository source
                              ↓
                    Flux Kustomization reconciler
                              ↓
                    Kubernetes cluster state
```

### Bootstrap Sequence (Phase 3)

Run AFTER k0s cluster provisioned (Phase 1) and KubeVela installed (Phase 2):

Phase 3b now enables the **`st-environment` addon** (supersedes the standalone `flux-operator`
addon). `st-environment` installs flux-operator, creates the FluxInstance, capability
GitRepository sources, and per-system ResourceSets in one operation.

```bash
# Inject credentials (REQUIRED before addon enable)
kubectl create secret generic harbor-admin-credentials -n harbor \
  --from-literal=HARBOR_ADMIN_PASSWORD=<pw> \
  --from-literal=values.yaml="harborAdminPassword: <pw>"

kubectl create secret docker-registry harbor-oci-credentials -n flux-system \
  --docker-server=harbor-core.harbor.svc.cluster.local \
  --docker-username=admin --docker-password=<pw>

# Full bootstrap (Phases 3a–3d)
staccato bootstrap init \
  --addons-dir src/staccato-toolkit/core/assets/addons \
  --app-manifest src/staccato-toolkit/core/assets/bootstrap/gitops-provider-app.yaml
```

### Manual Steps (if needed)

```bash
# Phase 3a: Enable Harbor addon
vela addon enable ./src/staccato-toolkit/core/assets/addons/harbor

# Phase 3b: Enable st-environment addon (installs flux-operator, FluxInstance, ResourceSets)
vela addon enable ./src/staccato-toolkit/core/assets/addons/st-environment \
  --set name=local \
  --set target=local \
  --set gitopsConfig.url=oci://harbor-core.harbor.svc.cluster.local/staccato/manifests \
  --set gitopsConfig.configRepoURL=<your-config-repo-url>

# Phase 3c: Seed initial OCI artifact
staccato bootstrap oci-seed \
  --registry-url oci://harbor-core.harbor.svc.cluster.local/staccato/manifests \
  --tag bootstrap

# Phase 3d: Apply gitops-provider Application
kubectl apply -f src/staccato-toolkit/core/assets/bootstrap/gitops-provider-app.yaml
```

### Adding a CI Push Step

To push manifests from a CI pipeline (GitHub Actions):

```yaml
- name: Push manifests to Harbor
  run: |
    flux push artifact \
      oci://harbor-core.harbor.svc.cluster.local/staccato/manifests:${{ github.sha }} \
      --source=. \
      --path=.
    flux tag artifact \
      oci://harbor-core.harbor.svc.cluster.local/staccato/manifests:${{ github.sha }} \
      --tag latest
```

### See Also

- [Harbor usage rules](../../rules/technologies/harbor.md)
- [Flux Operator usage rules](../../rules/technologies/flux-operator.md)
- [Flux v2 usage rules](../../rules/technologies/flux.md)
- [KubeVela usage rules](../../rules/technologies/kubevela.md)

---

## Manifest Rendering Tasks (`src/ops/workloads/`)

The workloads dagger module (`src/ops/workloads/`) provides two production tasks for the
GitOps manifest pipeline: `render` and `publish-module`.

> **Note**: This module lives at `src/ops/workloads/`, not `src/ops/platform/`. Run `dagger call`
> commands from within `src/ops/workloads/` or pass `--module src/ops/workloads` from root.

### `render` — Kustomize Build + OCI Push

Reads a `kustomization.yaml` containing `helmCharts` entries, runs
`kustomize build --enable-helm` per chart, and pushes each chart's rendered manifests as an OCI
artifact to a Harbor registry.

**OCI artifact URL pattern per chart:**
```
<registryURL>/<chart.name>:<env>-<short-sha>
```

**Local testing (with RegistryService):**
```bash
cd src/ops/workloads
# Bind a local registry:2 service on port 5000 (alias "harbor")
dagger call render \
  --source ../.. \
  --kustomization-dir ../../src/staccato-toolkit/core/assets/addons/st-workloads/src \
  --env local \
  --registry-url oci://harbor:5000/staccato/manifests
```

**CI (pointing at in-cluster Harbor):**
```bash
dagger call render \
  --source ../.. \
  --kustomization-dir ../../envs/ops \
  --env dev \
  --registry-url oci://harbor-core.harbor.svc.cluster.local/staccato/manifests \
  --registry-credentials env:DOCKER_CONFIG_JSON
```

**Parameters:**

| Parameter | Required | Description |
|---|---|---|
| `--source` | yes | Git repository root (for SHA resolution and provenance) |
| `--kustomization-dir` | yes | Directory containing `kustomization.yaml` with `helmCharts` list |
| `--env` | yes | One of: `local`, `dev`, `staging`, `prod` |
| `--registry-url` | yes | OCI registry base URL (no trailing slash) |
| `--registry-credentials` | no | Docker config JSON secret (for authenticated registries) |

**Atomicity guarantee:** All charts are rendered before any push. A render failure leaves
nothing pushed. Push failures abort the sequence.

### `publish-module` — Push Dagger Module to Daggerverse

Builds and publishes the Platform Dagger module to Daggerverse, tagged with the current git SHA.

```bash
cd src/ops/workloads
dagger call publish-module \
  --source ../.. \
  --dagger-token env:DAGGER_TOKEN
```

Returns the published module reference (e.g. `github.com/org/repo/src/ops/workloads@<sha>`).

**Parameters:**

| Parameter | Required | Description |
|---|---|---|
| `--source` | yes | Git repository root (for SHA tagging) |
| `--dagger-token` | yes | Daggerverse authentication token |

### `registry-service` — Local OCI Registry for Testing

Starts a `registry:2` container as a Dagger service on port 5000 with alias `harbor`.
Use to test `render` locally without an external Harbor deployment.

```bash
cd src/ops/workloads
dagger call registry-service
```

The alias `harbor` matches the in-cluster Harbor DNS pattern, so test URLs
(`oci://harbor:5000/...`) require no modification when targeting the real Harbor in CI.

---

## In-Cluster Render Workflow (ops-environment)

The canonical way to trigger manifest rendering in production is by applying an
`ops-environment` KubeVela component with `gitopsConfig.ref` set to the current git
SHA. KubeVela's Application workflow automatically runs `dagger call render` via a
Kubernetes Job — no manual CI step needed.

### How It Works

```
kubectl apply → KubeVela reconciles ops-environment Application
                    │
                    ├─ Step 1: applies staccato-environment component (creates ConfigMap)
                    └─ Step 2: runs render-manifests Job
                                  └─ alpine + dagger CLI
                                  └─ mounts ConfigMap /kustomization/kustomization.yaml
                                  └─ DAGGER_CLOUD_TOKEN from dagger-cloud-token secret
                                  └─ dagger call render --sha <gitopsConfig.ref> ...
                                  └─ pushes OCI artifacts to Harbor
```

### Triggering a Render

Set `gitopsConfig.ref` to the git SHA you want rendered and apply the Application:

```bash
# Set ref to current commit SHA — this becomes the OCI tag suffix
SHA=$(git rev-parse --short HEAD)

kubectl apply -f - <<EOF
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: ops-env-config
  namespace: vela-system
spec:
  components:
    - type: ops-environment
      name: ops
      properties:
        environment:
          name: ops
          gitopsConfig:
            url: oci://harbor-core.harbor.svc.cluster.local/staccato/manifests
            ref: "${SHA}"
            pullSecret: harbor-oci-credentials
EOF
```

KubeVela runs the two workflow steps automatically. The render Job appears in
`vela-system` as `render-ops-<appname>`.

### Checking Render Status

```bash
# Watch the workflow progress
vela status <app-name> -n vela-system --watch

# Check the render Job directly
kubectl get jobs -n vela-system -l st-environment/render=true
kubectl logs -n vela-system job/render-ops-<appname>
```

### Prerequisites

The `dagger-cloud-token` secret must exist in `vela-system` before the Application
is applied. Create it once during bootstrap:

```bash
kubectl create secret generic dagger-cloud-token \
  --namespace vela-system \
  --from-literal=token=<DAGGER_CLOUD_TOKEN>
```

See [Dagger Cloud usage rules](../../rules/technologies/dagger-cloud.md) for full
credential and caching guidance.

### Relationship to `dagger call render` (direct invocation)

Both paths call the same Dagger function. Use the in-cluster path for production;
use direct `dagger call render` for local debugging:

```bash
# Local debugging — bypasses the Job, runs against local Dagger engine
cd src/ops/workloads
dagger call render \
  --kustomization-dir ../../path/to/envs/ops \
  --env local \
  --registry-url oci://harbor:5000/staccato/manifests \
  --sha $(git rev-parse --short HEAD)
```
