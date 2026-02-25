---
created-by-change: garden-dev-environment
last-validated: 2026-02-26
---

# Garden Usage Rules

Garden (Cedar, 0.14) is the Kubernetes development orchestrator for this platform. It models the
application stack as a dependency graph of typed actions (Build, Deploy, Run, Test) with
content-hash caching across sessions. All application services are deployed via
`garden deploy --sync` for development, layered on top of a kind cluster provisioned by
`task dev-up`.

## Core Principle

Garden owns the application hot-reload inner loop. `project.garden.yml` at the repository root is
the entry point. Per-service `garden.yml` files declare Build and Deploy (or Run) actions. The
`local` environment targets `kind-staccato-dev`; the `ci` environment targets a remote cluster.
Garden MUST NOT be used to provision the cluster itself or the observability stack — those are owned
by `task dev-up`.

## Key Guidelines

### Project Configuration

The `project.garden.yml` at the repository root MUST use `apiVersion: garden.io/v2` and declare at
minimum `local` and `ci` environments:

```yaml
apiVersion: garden.io/v2
kind: Project
name: staccato

defaultEnvironment: local

environments:
  - name: local
    defaultNamespace: staccato
  - name: ci
    defaultNamespace: staccato

providers:
  - name: local-kubernetes
    environments: [local]
    context: kind-staccato-dev # MUST match the kind cluster context

  - name: kubernetes
    environments: [ci]
    context: ${env.CI_KUBE_CONTEXT}
```

**Key constraints:**

- `defaultNamespace` MUST match the namespace used in existing Kubernetes manifests (`staccato`)
- `context: kind-staccato-dev` MUST match the kubeconfig context created by `kind create cluster`
- `scan.exclude` MUST include `node_modules`, `.git`, `build`, `.devbox`, `.todos`, `.garden` to
  keep startup fast

### Action Types

Garden actions are typed. Use the correct type for each workload:

| Workload                          | Action type             | Notes                          |
| --------------------------------- | ----------------------- | ------------------------------ |
| Container image build             | `Build / container`     | All services use this          |
| Long-running service (Deployment) | `Deploy / kubernetes`   | staccato-server, backstage     |
| One-shot job (Kubernetes Job)     | `Run / kubernetes-pod`  | staccato-cli                   |
| Host-side command                 | `Run / exec`            | Optional: host-compile pattern |
| Test suite                        | `Test / kubernetes-pod` | Future: integration tests      |

### Build Actions: go.work Workspace

Go services that are part of the `go.work` workspace MUST set `source.path` to the repository root
and explicitly `include` all workspace modules the service depends on:

```yaml
kind: Build
type: container
name: staccato-server-image

source:
  path: ../../.. # repo root — required for go.work to be in the build context

include:
  - src/staccato-toolkit/server/**/*
  - src/staccato-toolkit/domain/**/* # include ALL imported workspace modules
  - go.work
  - go.work.sum

spec:
  dockerfile: src/staccato-toolkit/server/Containerfile.dev
```

**Why:** Garden computes version hashes from the `include` set. If `domain/` is not listed, a change
to the domain module will not invalidate the server's version hash and the server will not be
rebuilt. `go.work` must be in the build context for in-container `go build` to resolve
workspace-relative module paths.

### Deploy Actions: patchResources

Existing Kubernetes manifests (in `src/ops/dev/manifests/`) MUST NOT be modified to hard-code
Garden-managed image tags. Use `spec.patchResources` to inject the built image tag at deploy time:

```yaml
spec:
  manifestFiles:
    - src/ops/dev/manifests/staccato-server/deployment.yaml
    - src/ops/dev/manifests/staccato-server/service.yaml

  patchResources:
    - name: staccato-server
      kind: Deployment
      patch:
        spec:
          template:
            spec:
              containers:
                - name: staccato-server
                  image: ${actions.build.staccato-server-image.outputs.deploymentImageId}
                  imagePullPolicy: IfNotPresent # override Never — Garden loads its own tag
```

**Always override `imagePullPolicy`:** Existing manifests use `imagePullPolicy: Never` for
manually-loaded images. Garden uses its own content-hash tag and loads it automatically —
`IfNotPresent` is correct.

### Sync Mode: Security Context Patch

Garden's Mutagen sync writes files into the running container at runtime. Containers with
`readOnlyRootFilesystem: true` will block sync writes. Patch this in `patchResources` for dev — the
production manifest is unchanged:

```yaml
patchResources:
  - name: staccato-server
    kind: Deployment
    patch:
      spec:
        template:
          spec:
            containers:
              - name: staccato-server
                securityContext:
                  readOnlyRootFilesystem: false # REQUIRED for Mutagen sync
```

### Sync Mode: defaultOwner

When the container runs as a non-root user (`runAsUser: 1000`), Mutagen must write files with
matching ownership. Set `defaultOwner` on all sync paths:

```yaml
sync:
  paths:
    - sourcePath: src/staccato-toolkit/server
      containerPath: /workspace
      mode: one-way-replica
      defaultOwner: 1000 # matches runAsUser in deployment spec
```

### Sync Mode: Backstage node_modules Safety

Backstage sync paths MUST explicitly exclude `node_modules` at every level. Overwriting the
container's `node_modules` (installed for Linux during the Docker build) with host-platform files
will crash the Backstage pod:

```yaml
# ✓ Good: surgical source-only sync
sync:
  paths:
    - sourcePath: packages
      containerPath: /workspace/packages
      mode: one-way-replica
      exclude:
        - "*/node_modules/**/*"   # REQUIRED — never overwrite container node_modules
        - "*/dist/**/*"

# ✗ Avoid: broad workspace sync — will wipe node_modules
sync:
  paths:
    - sourcePath: .
      containerPath: /workspace
      mode: one-way-replica
```

### Caching

Garden's content-hash cache is stored in `.garden/` at the project root. This directory:

- MUST be in `.gitignore` — it is machine-local state
- Persists across `garden deploy` invocations (cross-session caching is the primary value)
- Can be safely deleted to force a full rebuild: `rm -rf .garden/ && garden deploy`

On a fresh `garden deploy` with no source changes, Garden will report all actions as cached and
perform zero rebuilds. This is expected and correct.

### Environment Variables in CI

The `ci` environment reads the cluster context from an environment variable:

```yaml
providers:
  - name: kubernetes
    environments: [ci]
    context: ${env.CI_KUBE_CONTEXT}
```

In CI pipelines, set `CI_KUBE_CONTEXT` to the kubeconfig context for the target cluster before
running `garden deploy --env ci`.

### Lifecycle Split: task vs. garden

| Responsibility                    | Tool                            |
| --------------------------------- | ------------------------------- |
| Create/delete kind cluster        | `task dev-up` / `task dev-down` |
| Deploy observability stack (Helm) | `task dev-up`                   |
| Deploy application services       | `garden deploy`                 |
| Hot-reload sync session           | `garden deploy --sync`          |
| Remove Garden-managed resources   | `garden cleanup`                |

**Never use Garden to provision the cluster or the observability stack.** These are managed by
`task dev-up` and must remain stable while application code changes.

## Common Commands

```bash
# Start hot-reload session for all services
garden deploy --sync

# Deploy without sync (CI-style)
garden deploy --env ci

# Show action graph status and cache hits
garden get status

# Run all tests (results cached by version hash)
garden test

# Show active sync sessions
garden sync status

# Restart all Mutagen sync sessions
garden sync restart

# Remove all Garden-managed cluster resources
garden cleanup

# Force full rebuild (clear cache)
rm -rf .garden/ && garden deploy
```

## Common Issues

**`garden deploy` reports everything cached but pods are not running** → The `.garden/` cache
reflects a previous cluster that was deleted. Run `rm -rf .garden/ && garden deploy` to force a full
rebuild and redeploy.

**Mutagen sync session does not start** → Check `garden sync status`. Common causes:
`readOnlyRootFilesystem: true` not patched in `patchResources`; pod is not yet Running. Verify with
`kubectl get pods -n staccato --context kind-staccato-dev`.

**`ImagePullBackOff` after `garden deploy`** → Garden uses its own image tag (`<name>:v-<hash>`).
The manifest's `imagePullPolicy: Never` only works for manually-loaded images. Ensure
`patchResources` overrides both `image` and `imagePullPolicy: IfNotPresent`.

**Backstage pod crashes after sync with `Cannot find module`** → A sync path was too broad and
overwrote the container's `node_modules`. Ensure all Backstage sync paths include
`exclude: ["*/node_modules/**/*"]`. Restart the pod:
`kubectl rollout restart deployment/backstage -n staccato --context kind-staccato-dev`.

**Unexpected full rebuild on unchanged source** → A file in the Build action's `include` set changed
(IDE metadata, `.DS_Store`, build artifacts). Add the offending path to `exclude` in the Build
action. Inspect the version with `garden get actions build.<name>`.

**`garden` command not found after `devbox shell`** → The init_hook installer places garden in
`~/.garden/bin`. Add to PATH: `export PATH=$PATH:$HOME/.garden/bin`. The installer prints this
instruction on first run.

## See Also

- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — Quick-start, hot-reload workflows, full command
  reference
- [project.garden.yml](../../../project.garden.yml) — Project-level configuration
- [IaC pattern rules](../patterns/delivery/iac.md) — Infrastructure-as-code conventions
- [environments pattern rules](../patterns/delivery/environments.md) — Environment parity guidelines
- [kind usage rules](./kind.md) — kind cluster management
- [Garden Cedar documentation](https://docs.garden.io/cedar-0.14) — Official reference
