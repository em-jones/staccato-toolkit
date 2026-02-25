---
created-by-change: adopt-penpot
last-validated: 2026-02-28
---

# Penpot Usage Rules

Penpot is the open-source, self-hosted UI/UX design and prototyping platform for this platform. It runs in the `penpot` namespace on `kind-staccato-dev` and is deployed via Garden + the official Penpot Helm chart.

## Core Principle

Penpot is a **deployed service**, not a build tool. It is accessed via Garden port-forwards during local development — no ingress controller or TLS is configured for local dev. All configuration lives in `src/ops/penpot/`.

## Helm Chart

| Property      | Value                                 |
| ------------- | ------------------------------------- |
| Chart name    | `penpot`                              |
| Repository    | `https://helm.penpot.app`             |
| Chart version | `0.9.1`                               |
| App version   | `2.4.2`                               |
| Upstream      | https://github.com/penpot/penpot-helm |

**Do NOT use** `https://penpot.app/helm-charts` — this URL returns a 404.

## Known Issues (chart 0.9.1)

The Penpot 0.9.1 Helm chart pins specific Bitnami image tags for PostgreSQL and Redis that have been removed from Docker Hub:

| Component  | Pinned tag (removed)                      | Override used |
| ---------- | ----------------------------------------- | ------------- |
| PostgreSQL | `bitnami/postgresql:16.3.0-debian-12-r15` | `latest`      |
| Redis      | `bitnami/redis:7.2.5-debian-12-r0`        | `latest`      |

Always override these in `values.yaml` for local dev:

```yaml
postgresql:
  image:
    tag: latest
    pullPolicy: IfNotPresent

redis:
  image:
    tag: latest
    pullPolicy: IfNotPresent
```

**Pre-load images into kind** before deploying (images are not pulled from Docker Hub inside kind):

```bash
docker pull bitnami/postgresql:latest && kind load docker-image bitnami/postgresql:latest --name staccato-dev
docker pull bitnami/redis:latest && kind load docker-image bitnami/redis:latest --name staccato-dev
```

## Deployment

```bash
# Deploy Penpot
garden deploy --env local deploy.penpot

# Run health check
garden test test.penpot-health-check

# View logs
garden logs deploy.penpot

# Check pod status
kubectl get pods -n penpot --context kind-staccato-dev
```

## Access (Local Dev)

After `garden deploy`, Penpot is available via Garden port-forwards:

| Service     | Local URL             | Notes                |
| ----------- | --------------------- | -------------------- |
| Web UI      | http://localhost:3000 | Penpot design canvas |
| Backend API | http://localhost:6060 | REST API             |

**Create a local account**: Registration is enabled via `disable-email-verification` flag. Navigate to http://localhost:3000 and register directly — no email confirmation required.

## Service Names (Kubernetes)

The Helm release name `penpot` determines service names:

| Component        | Service Name      | Port |
| ---------------- | ----------------- | ---- |
| Frontend (nginx) | `penpot`          | 8080 |
| Backend (API)    | `penpot-backend`  | 6060 |
| Exporter         | `penpot-exporter` | 6061 |

In-cluster DNS: `http://penpot.penpot.svc.cluster.local:8080/`

## Configuration (`values.yaml`)

Key configuration sections in the official chart schema:

```yaml
global:
  postgresqlEnabled: true # Enable bundled PostgreSQL
  redisEnabled: false # Redis not needed for local dev

config:
  publicUri: "http://localhost:3000" # Must match local port-forward
  flags: "enable-registration enable-login-with-password disable-email-verification disable-secure-session-cookies"
  apiSecretKey: "<random 64+ char string>" # Generate: python3 -c "import secrets; print(secrets.token_urlsafe(64))"
  postgresql:
    host: "" # Empty = use bundled postgresql subchart
    username: "penpot"
    password: "<password>"
    database: "penpot"

ingress:
  enabled: false # Use Garden port-forwards instead
```

**IMPORTANT**: `config.*` is the correct values path — the chart does NOT use flat `env:` keys like `PENPOT_PUBLIC_URI`.

## Namespace

Penpot runs in the dedicated `penpot` namespace. It does NOT share the `staccato` namespace with other platform services.

## Persistence

| Volume         | Purpose              | Size |
| -------------- | -------------------- | ---- |
| PostgreSQL PVC | Database             | 5Gi  |
| Assets PVC     | Design files, images | 10Gi |

Storage class: `standard` (default kind provisioner).

**Minimum node disk**: Ensure the kind node has at least 20Gi free before deploying Penpot.

## Troubleshooting

### Penpot not accessible at localhost:3000

Check if the Garden port-forward is active:

```bash
garden sync status   # or check the deploy.penpot port-forward
kubectl get pods -n penpot --context kind-staccato-dev
```

### Backend pod CrashLoopBackOff

Usually a database connection failure. Check:

```bash
kubectl logs -n penpot -l app.kubernetes.io/name=penpot,app.kubernetes.io/component=backend --context kind-staccato-dev
kubectl get pvc -n penpot --context kind-staccato-dev
```

Ensure `global.postgresqlEnabled: true` in values.yaml and the PostgreSQL pod is Running.

### Storage PVC stuck in Pending

The `standard` StorageClass must exist in the cluster:

```bash
kubectl get storageclass --context kind-staccato-dev
```

On kind, `standard` is provided by the default local-path provisioner.

### Health check fails (`/api/rpc/command/get-profile` returns non-200)

The backend may still be initialising (running migrations). Wait 60s after deploy and retry:

```bash
garden test test.penpot-health-check
```

**Note**: Penpot v2.4.2 backend does not expose `/api/health`. Use `/api/rpc/command/get-profile` as a liveness probe — it returns 200 with anonymous user JSON when the backend is healthy.

## See Also

- [src/ops/penpot/garden.yml](../../../src/ops/penpot/garden.yml) — Garden action definitions
- [src/ops/penpot/values.yaml](../../../src/ops/penpot/values.yaml) — Helm values
- [src/ops/penpot/README.md](../../../src/ops/penpot/README.md) — Developer quick-start
- [Garden usage rules](./garden.md) — Garden conventions for this platform
- [Penpot official documentation](https://help.penpot.app/technical-guide/configuration/)
- [Penpot Helm chart](https://github.com/penpot/penpot-helm)
