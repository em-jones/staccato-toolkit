# Skill: Garden Dev Environment

**Description**: Guidance for agents implementing or modifying Garden action configs (`project.garden.yml`, per-service `garden.yml`) for the staccato platform. Covers action types, sync mode, `patchResources`, go.work build context patterns, and the lifecycle split between `task dev-up` and `garden deploy`.

**When to use**: When creating or modifying `project.garden.yml`, adding a new service's `garden.yml`, configuring sync mode for a new workload, or troubleshooting Garden deployment failures.

---

## Quick Start

### I need to add a new Go service to Garden

1. Read `.opencode/rules/technologies/garden.md` — all Garden usage rules for this platform
2. Create `<service-dir>/garden.yml` with two documents: a `Build` action and a `Deploy` action
3. Set `source.path: ../../..` (repo root) on the Build action if the service is in the `go.work` workspace
4. Include all workspace modules the service imports in the `include` list
5. Use `patchResources` to inject the image tag — never modify the manifest file
6. Patch `readOnlyRootFilesystem: false` in `patchResources` if the manifest has it set to `true`
7. Set `defaultOwner: 1000` on all sync paths (matches `runAsUser: 1000` in deployments)
8. Add `watchexec` override command in `sync.overrides` for in-container rebuild
9. Run `garden get status` to verify the action is discovered and the version hash resolves

### I need to add a new Node.js service to Garden

1. Read `.opencode/rules/technologies/garden.md`
2. Create `<service-dir>/garden.yml` with a `Build` action and a `Deploy` action
3. In the Build action `exclude`, add `node_modules/**/*` and `packages/**/node_modules/**/*`
4. In the Deploy `sync.paths`, use surgical paths targeting source directories only
5. Add `exclude: ["*/node_modules/**/*", "*/dist/**/*"]` to every sync path entry
6. **Never** sync to the container workspace root — this will wipe `node_modules`
7. Configure port-forwards for both backend (7007) and frontend (3000) ports

### I need to add a CLI tool (Job workload) to Garden

1. Create a `Build / container` action with go.work-aware build context
2. Create a `Run / kubernetes-pod` action referencing the Job manifest via `spec.manifestFiles`
3. Use `patchResources` to inject the image tag into the Job spec
4. Do NOT configure `spec.sync` — Jobs are not sync targets

### I need to debug a sync mode failure

1. Run `garden sync status` — lists active Mutagen sessions and their state
2. Run `garden sync restart` — restarts all sessions
3. Check `readOnlyRootFilesystem` is patched to `false` in the Deploy action's `patchResources`
4. Check `defaultOwner` matches the container's `runAsUser`
5. Check the pod is Running: `kubectl get pods -n staccato --context kind-staccato-dev`
6. If Backstage crashes after sync, a sync path is too broad — check `node_modules` exclusions

---

## Action Config Patterns

### Go Service (full example)

```yaml
# src/<module>/garden.yml

apiVersion: garden.io/v0
kind: Build
type: container
name: <service>-image

source:
  path: ../../..   # repo root — required for go.work

include:
  - src/<module>/**/*
  - src/staccato-toolkit/domain/**/*   # all imported workspace modules
  - go.work
  - go.work.sum

spec:
  dockerfile: src/<module>/Containerfile.dev

---

apiVersion: garden.io/v0
kind: Deploy
type: kubernetes
name: <service>

dependencies:
  - build.<service>-image

source:
  path: ../../..

spec:
  namespace: staccato

  manifestFiles:
    - src/ops/dev/manifests/<service>/deployment.yaml
    - src/ops/dev/manifests/<service>/service.yaml

  patchResources:
    - name: <service>
      kind: Deployment
      patch:
        spec:
          template:
            spec:
              containers:
                - name: <service>
                  image: ${actions.build.<service>-image.outputs.deploymentImageId}
                  imagePullPolicy: IfNotPresent
                  securityContext:
                    readOnlyRootFilesystem: false   # required for Mutagen sync

  defaultTarget:
    kind: Deployment
    name: <service>
    containerName: <service>

  sync:
    paths:
      - sourcePath: src/<module>
        containerPath: /workspace
        mode: one-way-replica
        defaultOwner: 1000
        exclude:
          - <service>           # don't overwrite the compiled binary
          - "**/*_test.go"
      - sourcePath: src/staccato-toolkit/domain
        containerPath: /workspace/domain
        mode: one-way-replica
        defaultOwner: 1000
    overrides:
      - command:
          - watchexec
          - -r
          - --exts
          - go,mod,sum
          - --
          - sh
          - -c
          - "go build -o /workspace/<service> . && /workspace/<service>"

  portForwards:
    - name: http
      resource: Service/<service>
      targetPort: 8080
      localPort: 8080
```

### Node.js Service (Backstage pattern)

```yaml
apiVersion: garden.io/v0
kind: Build
type: container
name: <service>-image

include:
  - package.json
  - yarn.lock
  - .yarnrc.yml
  - .yarn/**/*
  - packages/**/*
  - plugins/**/*
  - tsconfig.json
  - app-config.yaml

exclude:
  - node_modules/**/*
  - packages/**/node_modules/**/*
  - packages/**/dist/**/*

spec:
  dockerfile: Containerfile.dev

---

apiVersion: garden.io/v0
kind: Deploy
type: kubernetes
name: <service>

dependencies:
  - build.<service>-image

spec:
  namespace: staccato

  # ... manifests or inline manifest ...

  defaultTarget:
    kind: Deployment
    name: <service>
    containerName: <service>

  sync:
    paths:
      - sourcePath: packages
        containerPath: /workspace/packages
        mode: one-way-replica
        exclude:
          - "*/node_modules/**/*"   # REQUIRED
          - "*/dist/**/*"
      - sourcePath: plugins
        containerPath: /workspace/plugins
        mode: one-way-replica
        exclude:
          - "*/node_modules/**/*"

  portForwards:
    - name: frontend
      resource: Service/<service>
      targetPort: 3000
      localPort: 3000
    - name: backend
      resource: Service/<service>
      targetPort: 7007
      localPort: 7007
```

### Job Workload (CLI pattern)

```yaml
apiVersion: garden.io/v0
kind: Build
type: container
name: <cli>-image

source:
  path: ../../..

include:
  - src/<module>/**/*
  - src/staccato-toolkit/domain/**/*
  - go.work
  - go.work.sum

spec:
  dockerfile: src/<module>/Containerfile.dev

---

apiVersion: garden.io/v0
kind: Run
type: kubernetes-pod
name: <cli>-health

dependencies:
  - build.<cli>-image

source:
  path: ../../..

spec:
  namespace: staccato
  manifestFiles:
    - src/ops/dev/manifests/<cli>/job.yaml
  patchResources:
    - name: <job-name>
      kind: Job
      patch:
        spec:
          template:
            spec:
              containers:
                - name: <cli>
                  image: ${actions.build.<cli>-image.outputs.deploymentImageId}
                  imagePullPolicy: IfNotPresent
```

---

## Critical Rules (always check)

| Rule | Why |
|------|-----|
| `source.path: ../../..` on Go Build actions | `go.work` must be in the build context for workspace module resolution |
| Include all imported workspace modules in `include` | Missing modules → version hash misses domain changes → stale builds |
| `imagePullPolicy: IfNotPresent` in patchResources | Manifests use `Never` for manual loads; Garden loads its own hash tag |
| `readOnlyRootFilesystem: false` in patchResources | Mutagen writes files at runtime; read-only filesystem blocks all sync |
| `defaultOwner: 1000` on Go sync paths | Container runs as UID 1000; Mutagen must write with matching ownership |
| `exclude: ["*/node_modules/**/*"]` on Node.js sync paths | Overwriting container node_modules with host binaries crashes the pod |
| Never sync to `/workspace` for Node.js | Too broad — will delete node_modules installed during Docker build |
| `garden` not in nixpkgs | Installed via init_hook curl installer; check `~/.garden/bin` is on PATH |

---

## Verification Steps

After adding a new service's `garden.yml`:

```bash
# 1. Verify action is discovered
garden get status

# 2. Verify version hash resolves (no "missing source" errors)
garden get actions build.<service>-image

# 3. Deploy and check the pod starts
garden deploy
kubectl get pods -n staccato --context kind-staccato-dev

# 4. Start sync and verify a file change propagates
garden deploy --sync
# Edit a source file, watch garden output for sync event
# Verify service responds: curl http://localhost:<port>/healthz
```

---

## See Also

- [Garden Usage Rules](../../rules/technologies/garden.md) — Full rule reference
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — Developer workflow, quick-start, port-forward map
- [project.garden.yml](../../../project.garden.yml) — Live project config
- [hot-reload-development skill](../hot-reload-development/SKILL.md) — Container-level hot-reload patterns
- [Garden Cedar docs](https://docs.garden.io/cedar-0.14) — Official reference
