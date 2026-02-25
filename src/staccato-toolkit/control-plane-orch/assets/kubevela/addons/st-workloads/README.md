# st-environment Addon

## Agent instructions

1. Read through the `st-environment` design proposal and implementation plan outlined in this
   document
2. Use `development-orchestration` skill to implement an MVP version of this addon
   - **NOTE** please use [kustomize](./src/kustomization.yaml) to populate the `flux-operator`
     resources — run `kustomize build src/ -o resources/` from this addon directory
3. Validate implementation by testing using `garden`

## Architectural decisions

### Harbor Helm chart

Use the **official goharbor community chart**: `https://helm.goharbor.io` / chart name `harbor`.
This is the chart maintained by the Harbor project itself (not Bitnami).

```
repoURL:  https://helm.goharbor.io
chart:    harbor
version:  1.18.2   # latest as of 2026-03-03; pin and bump via Renovate
```

### flux-operator bootstrap (Phase 1)

Install the flux-operator via its **official Helm chart** served from the OCI registry:

```
repoType: oci
url:      oci://ghcr.io/controlplaneio-fluxcd/charts
chart:    flux-operator
version:  0.43.0   # latest as of 2026-03-03
```

The `src/kustomization.yaml` renders static install manifests (CRDs + RBAC) pulled from the upstream
GitHub release into `resources/`. These manifests are applied first (Phase 1) so the `FluxInstance`
and `ResourceSet` CRDs exist before the Helm release is applied.

Run from this directory to regenerate:

```bash
kustomize build src/ -o resources/
```

### FluxInstance & ResourceSet CRDs

Both CRDs are rendered by the kustomize step above from the upstream
`https://github.com/controlplaneio-fluxcd/flux-operator/releases/latest/download/install.yaml`
manifest. Check `resources/` after running the kustomize build to see the full schema.

### auth-casdoor

Uses the community Helm chart from **krzwiatrzyk**:

```
repoURL:  https://krzwiatrzyk.github.io/charts/
chart:    casdoor
version:  1.0.0
```

A simple single-replica Deployment with a bundled SQLite backend is sufficient for the local/ops
MVP. Production deployments should switch to an external PostgreSQL database via
`database.driver=postgres`.

### auth-cognito

Deferred — not implemented in the MVP. Placeholder parameter accepted but no resources rendered.

### system component type

Deferred — `systems: [...{}]` remains untyped for now. The system component schema will be defined
in a follow-up change.

## What is st-environment?

The `st-workloads` addon offers:

- [ ] GitOps-managed `environment`s (component types)
- [ ] Opinionated `local`, `ops`, and `runtime` environments
- [ ] Automatic image caching and vulnerability scanning with `harbor` and `trivy`
  - All images configured to be proxied through `harbor`
- [ ] Security services (e.g., `trivy`, `external-secrets`)
- [ ] Observability services (e.g., `hosted-lgtm`, `aws-managed-observability`)
- [ ] Authentication services (e.g., `auth-casdoor`, `auth-cognito`)
- [ ] Dev portal with `backstage`
- [ ] Visualization with `headlamp`
- [ ] Design with `penpot`
- [ ] Application scaling with `keda`
- [ ] wasm runtimes with `wasmcloud`
- [ ] Automatic configuration updates with `reloader`
- [ ] GitOps management with `flux` (default) or `argo-cd` (TBD)
- [ ] Cluster management with `ocm` (TBD)

## Phase 0: Secure image loading to kubelet (TBD)

- [ ] Use `self-owned` `harbor` image in `s3` storage to enable

## Environment Components

### `environment` component

Each of the `local`, `ops`, and `runtime` environments will render an `OAM` application using this
component

Environment components are responsible for installing and managing the core infrastructure and
services required for the development, deployment, and operation of applications in the `kubevela`
ecosystem.

#### Parameters

- `name` - name of the environment (e.g., local, ops, runtime)
- `description` - brief description of the environment and its purpose
- `systems` - list of `system` components
- `harbor` - object configuring harbor (default: {enabled: true, trivyEnabled: true,
  proxyCacheConfigs: []})
- `observability-lgtm` - `component` definition
- `auth-provider` - `component` definition
- `otel-collector-operator` - object configuring opentelemetry-operator (default: {enabled: true}) &
  using alloy collector image
- `cert-manager` - object configuring cert-manager (default: {enabled: true})
- `trivy` - object configuring trivvy (default: {enabled: true})
- `external-secrets` - object configuring external-secrets (default: {enabled: false})
- `reloader` - object configuring reloader (default: {enabled: false})
- `keda` - object configuring keda (default: {enabled: false})
- `wasmcloud` - object configuring wasmcloud (default: {enabled: false})
- `dev-portal` - object configuring backstage (default: {enabled: false})
- `headlamp` - object configuring headlamp (default: {enabled: true})
- `penpot` - object configuring penpot (default: {enabled: false})
- `external-dns` - object configuring external-dns instances (default: `{enabled: false, repo: ..., version: ..., instances: []}`). When enabled, each entry in `instances` is flattened to a separate Helm release keyed by `provider` (e.g. `external-dns-cloudflare`). Each instance requires `provider` and optionally `namespace` (default: `external-dns`) and `domains`.

#### Rollout Phases

##### Phase 1 flux-operator

    Apply static manifests from `./resources/` (CRDs + RBAC) rendered by `kustomize build src/ -o resources/`.
    This installs the `FluxInstance` and `ResourceSet` CRDs before any Helm release runs.

    Chart: `oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator` v0.43.0

##### Phase 2 harbor

    `HelmRepository` (https://helm.goharbor.io) + `HelmRelease` for `harbor` chart v1.18.2.
    Installs harbor for serving container images and helm charts; trivy-enabled by default.

##### Phase 3 flux-instance

    Renders `FluxInstance` CRD — installs Flux controllers and wires the OCI sync source.

##### Phase 4 ops-services

    Renders `ResourceSet CRD`

    - cert-manager
    - trivy-operator (optional)
    - external-secrets (optional)
    - reloader (optional)
    - opentelemetry-operator (optional)
    - keda (optional)

### `ops-environment` component

**NOTE** Only installed on `kubevela` control plane cluster

#### Parameters

- `environment` - object to be mapped to the generated `environment` component, with the following
  parameters:
  - `name`
  - `description`
  - `systems`
  - `penpot` - default {enabled: true}
  - `dev-portal` - default: {enabled: true}
  - `headlamp` - default: {enabled: true}
  - `trivy` - default: {enabled: true}
  - `auth-provider` - default to using a casdoor instance for local SSO & {enabled: true}
   - `observability-lgtm` - default to using docker-lgtm-otel stack for observability & {enabled:
     true}
  - `otel-collector-operator` - object configuring opentelemetry-operator (default: {enabled: true})
  - `external-dns` - object configuring external-dns instances (default: `{enabled: false, repo: ..., version: ..., instances: []}`). When enabled, each entry in `instances` is flattened to a separate Helm release keyed by `provider` (e.g. `external-dns-cloudflare`). Each instance requires `provider` and optionally `namespace` (default: `external-dns`) and `domains`.
  - `external-secrets` - default: {enabled: false}
  - `reloader` - default: {enabled: true}
  - `keda` - default: {enabled: false}
  - `wasmcloud` - default: {enabled: false}

### `runtime-environment` component

**NOTE** Only installed on runtime clusters

- `environment` - object to be mapped to the generated `environment` component, with the following
  parameters:
  - `name`
  - `description`
  - `systems`
  - `penpot` - default {enabled: false}
  - `dev-portal` - default: {enabled: false}
  - `headlamp` - default: {enabled: false}
  - `trivy` - default: {enabled: false}
  - `auth-provider` - default to using a casdoor instance for local SSO & {enabled: false}
   - `observability-lgtm` - default to using docker-lgtm-otel stack for observability & {enabled:
     false}
  - `otel-collector-operator` - object configuring opentelemetry-operator (default: {enabled:
    false})
  - `external-dns` - object configuring external-dns instances (default: `{enabled: false, repo: ..., version: ..., instances: []}`). When enabled, each entry in `instances` is flattened to a separate Helm release keyed by `provider` (e.g. `external-dns-cloudflare`). Each instance requires `provider` and optionally `namespace` (default: `external-dns`) and `domains`.
  - `external-secrets` - default: {enabled: false}
  - `reloader` - default: {enabled: true}
  - `keda` - default: {enabled: false}
  - `wasmcloud` - default: {enabled: true}

## Other Components

### Observability Providers

Goal - use this to configure observability

#### LGTM Providers

##### Common Parameters

- `lgtm-workspaces` - list of workspaces to be created in the observability provider, with their
  associated data sources and dashboards
- `lgtm-dashboards` - list of dashboards to be created in the observability provider, with their
  associated data sources and visualizations
- `lgtm-data-sources` - list of data sources to be created in the observability

##### `hosted-lgtm` component (default for local environment)

###### Parameters

- `config` - configuration object for the docker-lgtm-otel stack

##### `aws-managed-observability` component (default for runtime environment)

- `config` - configuration object to be used to connect to and configure AWS Managed Observability
  resources (e.g., workspaces, data sources, dashboards) using AWS SDK

### Auth Providers

#### Common Parameters

- `users` - list of users to be created in the SSO provider, with their roles and permissions
- `roles` - list of roles to be created in the SSO provider, with their permissions
- `permissions` - list of permissions to be created in the SSO provider, with their associated
  resources and actions

#### `auth-casdoor` component (default for local environment)

Deploys Casdoor (open-source SSO/IAM) via the community Helm chart
(`https://krzwiatrzyk.github.io/charts/`, chart: `casdoor`, v1.0.0).

MVP uses SQLite backend (bundled, no external DB required). For production, set
`database.driver=postgres` and supply connection details.

##### Parameters

- `name` - environment name suffix for resource naming
- `namespace` - target namespace (default: `casdoor`)
- `config` - configuration object for the casdoor instance:
  - `replicas` - number of replicas (default: 1)
  - `image` - casdoor image (default: `casbin/casdoor:latest`)
  - `database.driver` - `sqlite3` (default, MVP) or `postgres`
  - `database.dataSourceName` - DSN string (default: `file:casdoor.db?cache=shared`)
  - `ingress.enabled` - whether to create an Ingress (default: false)
  - `ingress.host` - hostname for the Ingress rule
- `users` - list of seed users (passed as Helm values; default: [])
- `roles` - list of roles (default: [])

#### `auth-cognito` component (default for deployed environment)

**Deferred** — not implemented in MVP. The parameter is accepted but no resources are rendered.

- `config` - configuration object to be used to connect to and configure AWS Cognito resources
  (e.g., user pools, identity pools) using AWS SDK

## Roadmap

- [ ] Add argo-cd as alternative to flux
- [ ] add `ocm` for cluster management
- [ ] use owned `harbor` image in `s3` storage to enable air-gapped installation
- [ ] auth-cognito component (AWS Cognito integration)
- [ ] system component type schema
- [ ] add opinionated `spiffe` system (maybe using cilium for networking?)
