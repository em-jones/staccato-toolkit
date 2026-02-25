---
created-by-change: manual
last-validated: 2026-02-25
---

# Repository Layout

The repository root is treated as the platform boundary. The `src/` directory is the root for all source code, organised by the **system** to which a component belongs.

## Core Principle

`src/` maps the organisation's systems onto the filesystem. Each first-level directory under `src/` names a **system** — a logical domain grouping (e.g., a developer portal, an ops toolchain, a data platform). Each sub-directory names a **component** within that system. No source code lives directly in `src/` itself, and no component lives at depth greater than two without a clear reason.

## Root Files

Several toolchain files live at the repository root. They configure the workspace as a whole and have no component-specific equivalent.

| File           | Purpose                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` | Root Yarn workspace manifest. Declares workspace paths and any scripts that apply to the whole repository (e.g., `lint`, `test`). Does **not** contain application dependencies — those belong in component `package.json` files. See [`docs/adr/yarn-workspace-strategy.md`](../../../../docs/adr/yarn-workspace-strategy.md) for the package manager rationale. |
| `.yarn/`       | Yarn cache directory and metadata. Always committed along with `.yarn.lock` to enable zero-install capability and reproducible installs across CI and local environments.                                                                                                                                                                                         |
| `.yarn.lock`   | Yarn lockfile. Always committed so that CI and local installs are reproducible.                                                                                                                                                                                                                                                                                   |
| `.yarnrc.yml`  | Yarn configuration. Specifies workspace settings, compression, and plug'n'play mode configuration.                                                                                                                                                                                                                                                                |
| `devbox.json`  | Devbox environment definition. Declares the Nix packages that make up the shared development shell (language runtimes, CLI tools).                                                                                                                                                                                                                                |
| `devbox.lock`  | Devbox lockfile. Pins the exact Nix package revisions declared in `devbox.json`. Always committed.                                                                                                                                                                                                                                                                |
| `Taskfile.yml` | Top-level [Task](https://taskfile.dev) runner entry point. Defines cross-component tasks and uses `includes:` to delegate to component-level `Taskfile.yml` files.                                                                                                                                                                                                |

These files are the only non-hidden files that live directly at the repository root. No source code, generated output, or component configuration belongs here.

## Layout

```
package.json                           # root workspace manifest (Yarn workspaces)
.yarn/                                 # Yarn cache and metadata
.yarn.lock                             # Yarn lockfile
.yarnrc.yml                            # Yarn configuration
devbox.json                            # Devbox environment definition
devbox.lock                            # Devbox lockfile
Taskfile.yml                           # task runner entry point

src/
└── <system>/                          # logical domain grouping
    └── <component>/                   # concrete technology or service within the system

examples/
├── <platform-use-case>/               # end-to-end example scoped to a specific platform use case
└── kitchen-sink/                      # comprehensive example exercising all platform capabilities

build/
└── <domain>/
    └── <environment>/
        └── <technology>/              # rendered manifests (k8s, cdk, …)

docs/                                  # cross-component documentation

.ops/
└── scripts/
    └── <domain>/                      # scripts scoped to a capability domain

.charts/                               # Helm charts (if adopted)

.devcontainer/                         # VS Code devcontainer configuration (if adopted)
.vscode/                               # shared VS Code workspace settings (if adopted)
```

### Example tree

```
package.json                # root workspace manifest — lists workspace paths, shared dev scripts
.yarn/                      # Yarn cache and metadata (committed for zero-install)
.yarn.lock                  # committed lockfile — ensures reproducible installs across CI and local
.yarnrc.yml                 # Yarn configuration (workspace settings, compression, PnP mode)
devbox.json                 # declares the Nix-based dev shell (Node, Yarn, Go versions, etc.)
devbox.lock                 # lockfile for Devbox — pinned Nix package revisions
Taskfile.yml                # top-level task definitions; delegates to component Taskfiles via includes

src/
├── dev-portal/
│   └── backstage/          # Backstage IDP installation
├── delivery/               # system that owns operational tooling
│   └── (dagger module)     # Go-based Dagger project at the system root
├── data-platform/
│   ├── warehouse/          # dbt / BigQuery project
│   └── ingestion/          # Kafka + connector configs
└── iam/
    └── policies/           # OPA/Rego policy bundle

examples/
├── data-ingestion/         # end-to-end example: ingest data from an external source
├── deploy-to-staging/      # end-to-end example: build and deploy a component to staging
└── kitchen-sink/           # comprehensive example exercising all platform capabilities

build/
├── delivery/
│   ├── staging/
│   │   └── k8s/            # rendered Kubernetes manifests for staging
│   └── production/
│       └── k8s/
└── data-platform/
    └── production/
        └── cdk/            # rendered CDK output for production

docs/
├── adr/                    # architecture decision records
├── design/                 # design documents
└── onboarding/             # onboarding guides

.ops/
└── scripts/
    ├── delivery/           # deployment and pipeline helper scripts
    ├── data-platform/      # data tooling and maintenance scripts
    └── iam/                # identity and policy management scripts

.charts/                    # Helm charts (if adopted)

.devcontainer/              # VS Code devcontainer configuration (if adopted)
.vscode/                    # shared VS Code workspace settings (if adopted)
```

## Operational Scripts

The `.ops/scripts/<domain>/` tree holds scripts that operate on the repository or its deployed artefacts but are **not** part of any source component. Use this location for:

- CI/CD helper scripts invoked outside a Dagger pipeline
- Ad-hoc maintenance or migration scripts
- Developer-experience utilities (e.g., seed data loaders, local-dev bootstrap)

`<domain>` mirrors the system names used under `src/` so it is clear which part of the platform a script relates to. Scripts that are cross-cutting (e.g., repository-wide bootstrap) live directly in `.ops/scripts/` without a sub-directory.

```
.ops/scripts/
├── bootstrap.sh            # cross-cutting: no domain sub-directory
├── delivery/
│   ├── rollback.sh
│   └── smoke-test.sh
└── data-platform/
    └── seed-dev-data.sh
```

Scripts here are **not** source code — they must not be imported or depended on by components under `src/`. Anything that needs to be reusable across CI and local development should be promoted into the Dagger module under `src/delivery/`.

## Rendered Manifests (`build/`)

`build/` holds rendered infrastructure and deployment manifests — output that is **generated** from source, not authored directly. Its three-level structure makes the scope of any artefact unambiguous:

```
build/<domain>/<environment>/<technology>/
```

- `<domain>` — mirrors a system name from `src/` (e.g., `delivery`, `data-platform`)
- `<environment>` — deployment target (e.g., `staging`, `production`)
- `<technology>` — the manifest format: `k8s` for Kubernetes YAML, `cdk` for AWS CDK Cloud Assembly output, etc.

Files under `build/` are typically committed so that diffs are visible in pull requests, but they are never edited by hand. The Dagger pipeline or a CI step is the only writer.

## Examples (`examples/`)

`examples/` holds self-contained, runnable examples that demonstrate how to use the platform. Each example is a standalone directory that can be cloned or copied without modification.

Two sub-directory conventions apply:

- `examples/<platform-use-case>/` — a focused example scoped to one real-world use case (e.g., `data-ingestion`, `deploy-to-staging`). Name after the use case, not the technology.
- `examples/kitchen-sink/` — a single comprehensive example that exercises as many platform capabilities as possible. Useful for integration testing and as a reference for new contributors.

Examples are **not** part of the production source tree. They must not be imported by components under `src/`. Each example should include a `README.md` explaining what it demonstrates and how to run it.

## Documentation (`docs/`)

`docs/` holds documentation that is **not** specific to a single component — content that spans systems or concerns the platform as a whole. Typical contents:

- `docs/adr/` — architecture decision records
- `docs/design/` — design documents and RFCs
- `docs/onboarding/` — onboarding guides for new contributors

Component-specific documentation (API references, runbooks, local-dev setup) lives alongside the component under `src/<system>/<component>/README.md` or a `docs/` sub-directory within that component.

## Helm Charts (`.charts/`)

`.charts/` holds Helm chart sources for any components that are deployed via Helm. This directory is optional — create it only if Helm is adopted.

Each chart lives in its own sub-directory named after the component it deploys:

```
.charts/
└── <component>/
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
```

The leading `.` keeps it out of the way of the main source tree while signalling that it is a tooling concern rather than application source.

## Dev Environment Tooling (`.devcontainer/`, `.vscode/`)

These directories hold **shared** IDE and development environment configuration. Both are optional and should be created only when the team has agreed to adopt the relevant tooling.

- `.devcontainer/` — VS Code devcontainer definition (`devcontainer.json`, `Dockerfile`). Provides a reproducible, containerised local development environment for contributors.
- `.vscode/` — Shared VS Code workspace settings (`settings.json`, `extensions.json`, `launch.json`). Contains settings that apply to everyone working in the repository — avoid storing personal preferences here.

Neither directory contains source code or generated artefacts.

## Key Guidelines

### Naming systems

- Use lowercase kebab-case for system names: `dev-portal`, `data-platform`, `iam`
- Name after the **capability domain**, not the technology: `dev-portal` not `backstage-system`
- A system should map roughly to an organisational or product boundary

### Naming components

- Use the technology or service name when there is only one implementation: `backstage`, `dagger`, `kafka`
- Use a functional name when there are multiple implementations or the technology is an implementation detail: `warehouse`, `ingestion`, `policies`
- A component directory is the repository root for that technology's tooling (its own `go.mod`, `package.json`, `pyproject.toml`, etc. lives here)

### One component = one technology root

Each component directory is self-contained. It owns:

- Its language/toolchain configuration (`go.mod`, `package.json`, `dagger.json`, …)
- Its own `README.md` if non-trivial
- No shared source files with sibling components (share via published packages or APIs, not symlinks)

### Depth limit

```
src/<system>/<component>/   ✓ standard depth
src/<system>/               ✓ acceptable when the system has exactly one component
src/                        ✗ no source files directly here
src/<system>/<a>/<b>/...    ✗ avoid depth > 2 without explicit justification
```

### Special case: single-component systems

When a system has exactly one component and the component boundary is obvious, the component directory may be omitted and the system directory serves as the component root:

```
src/ops/           # single Dagger module; no sub-directory needed
├── dagger.json
├── main.go
└── go.mod
```

If a second component is added later, introduce the sub-directories at that point.

## Common Issues

**"Where does shared library code go?"**
→ Shared code should be published as a versioned package (npm, Go module, PyPI). If it is truly internal and not yet publishable, place it under the consuming system as a local package, not as a top-level `src/shared/` or `src/lib/` directory. Avoid cross-system source imports.

**"Our system has multiple environments — do they get separate directories?"**
→ No. Environment separation is a delivery concern, not a source layout concern. Use environment configuration files, Helm values, or Kustomize overlays within the component directory. See [`environments`](../delivery/environments.md).

**"When do I create a new system directory vs. a new component under an existing one?"**
→ Create a new system when the capability domain is genuinely separate — different team ownership, different lifecycle, different user audience. When in doubt, start as a component under the closest existing system and promote later.

## See Also

- [`boundaries`](./boundaries.md) — Dependency rule and layer separation between components
- [`environments`](../delivery/environments.md) — Environment configuration strategy
- [`iac`](../delivery/iac.md) — Infrastructure-as-Code conventions for components that provision resources
- [Dagger usage rules](../../technologies/dagger.md) — Go-based ops module conventions
- [Backstage usage rules](../../technologies/backstage.md) — IDP component conventions
