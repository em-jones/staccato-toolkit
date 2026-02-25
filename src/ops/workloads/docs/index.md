# Platform Workloads

The Platform Workloads module is a [Dagger](https://dagger.io) pipeline module
written in Go. It provides the CI/CD tasks that run in GitHub Actions and
locally during development.

## Module

```
src/ops/workloads
dagger/workloads  (Dagger module name: platform)
Engine: v0.19.11, SDK: go
```

## Pipeline Tasks

All tasks accept a `--source` argument pointing at the repository root.

### `lint`

Runs `golangci-lint` against the source tree. Detects the linter configuration
file (`.golangci.yml`, `.golangci.yaml`, or `.golangci.json`) and installs the
linter automatically inside the container. Returns `"no linter configured"` if
no config file is found.

```bash
dagger call lint --source ../..
```

### `format`

Checks that all Go source files are `gofmt`-formatted. Returns the list of
unformatted files, or exits cleanly if all files are correctly formatted.

```bash
dagger call format --source ../..
```

### `test`

Runs the Go test suite across all workspace modules:

- `src/staccato-toolkit/cli`
- `src/staccato-toolkit/server`
- `src/staccato-toolkit/core`

Falls back to Node.js `npm test` if no `go.work` or `go.mod` is found.

```bash
dagger call test --source ../..
```

### `build`

Builds the project inside a `golang:1.23-alpine` container. Falls back to
`npm run build` for Node.js projects.

```bash
dagger call build --source ../..
```

### `shellcheck`

Runs [shellcheck](https://www.shellcheck.net/) static analysis against all `.sh`
files found in the repository. Uses `koalaman/shellcheck-alpine:stable` as the
base container image.

**Excluded paths**: `.git/`, all `node_modules/` directories (at any depth),
`.devbox/`.

**Exit behaviour**:

| Condition | Output | Exit code |
|---|---|---|
| No `.sh` files found | `"no shell scripts found"` | 0 |
| All scripts pass | `"all shell scripts passed shellcheck"` | 0 |
| Violations found | Violation details from shellcheck | non-zero |

```bash
dagger call shellcheck --source ../..
```

**Local alternative** (without Docker, after `devbox shell`):

```bash
find . -name "*.sh" -not -path "*/node_modules/*" -not -path "./.devbox/*" | xargs shellcheck
```

## CI/CD Integration

Tasks are invoked by GitHub Actions (`.github/workflows/ci.yml`) using
`dagger/dagger-for-github@v6`. The pipeline stages are:

```
push / pull_request
        │
        ├─► lint (golangci-lint + shellcheck)
        ├─► format
        │
        └─► test  (needs: lint, format)
               │
               └─► build (needs: lint, test)
```

## Running Locally

Ensure `dagger` is available (provided by Devbox):

```bash
devbox shell
cd src/ops/workloads
dagger call lint --source ../..
dagger call shellcheck --source ../..
dagger call test --source ../..
```
