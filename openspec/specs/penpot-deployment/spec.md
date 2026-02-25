---
td-board: adopt-penpot-penpot-deployment
td-issue: td-d35c04
---

# Specification: penpot-deployment

## Overview

Defines the requirements for deploying Penpot — the open-source, self-hosted UI/UX design platform — via Garden and Helm onto the `kind-staccato-dev` local Kubernetes cluster, including storage, health checks, and observability catalog registration.

## ADDED Requirements

### Requirement: Garden Helm deploy action

The platform SHALL deploy Penpot using a Garden `Deploy` action of type `helm` targeting the `penpot` namespace. The action MUST use the official Penpot Helm chart from `https://helm.penpot.app` and declare both `local` and `ci` environments. The `garden.yml` MUST use `apiVersion: garden.io/v0` (Helm actions use v0 per Garden docs) and include port-forwards for the frontend (port 80→3000) and backend API (port 6063→6063).

#### Scenario: Garden deploy succeeds

- **WHEN** a developer runs `garden deploy --env local deploy.penpot`
- **THEN** the Penpot frontend and backend pods reach `Running` state in the `penpot` namespace on `kind-staccato-dev` within 5 minutes

#### Scenario: Port-forward accessible

- **WHEN** `garden deploy --env local deploy.penpot` completes
- **THEN** the Penpot web UI is accessible at `http://localhost:3000` via the Garden port-forward

### Requirement: Penpot Helm values for local dev

The `values.yaml` MUST configure Penpot for local development use: frontend and backend enabled with resource requests appropriate for a kind cluster (frontend: 256Mi/250m, backend: 512Mi/500m), PostgreSQL enabled with a 5Gi persistent volume, assets storage (10Gi) and profiles storage (1Gi) persistent volumes using the `standard` storage class, and `PENPOT_FLAGS` set to `enable-registration enable-login` to allow local account creation. The ingress SHALL be disabled in favour of Garden port-forwards. TLS MUST NOT be configured for local dev.

#### Scenario: PostgreSQL connects

- **WHEN** the backend pod starts
- **THEN** it connects to the bundled PostgreSQL instance without errors in its logs

#### Scenario: Storage volumes bound

- **WHEN** `kubectl get pvc -n penpot` is run after deploy
- **THEN** all PVCs show `Bound` status

### Requirement: Penpot health-check Test action

The platform SHALL include a Garden `Test` action of type `container` named `penpot-health-check` that runs after `deploy.penpot`. The test MUST use `curlimages/curl:latest` and verify both the frontend HTTP endpoint (`http://penpot-frontend.penpot.svc.cluster.local/`) and the backend health endpoint (`http://penpot-backend.penpot.svc.cluster.local:6063/api/health`) return successful HTTP responses.

#### Scenario: Health check passes after deploy

- **WHEN** `garden test test.penpot-health-check` runs after a successful deploy
- **THEN** both curl checks exit 0 and the test action exits 0

### Requirement: Tech Radar entry for Penpot

Penpot SHALL be added to `docs/tech-radar.json` in the `Infrastructure` quadrant with ring `Trial`, with description: "Open-source, self-hosted UI/UX design and prototyping platform. Deployed via Helm on kind-staccato-dev."

#### Scenario: Tech Radar reflects Penpot

- **WHEN** the Backstage dev portal loads `docs/tech-radar.json`
- **THEN** Penpot appears in the Infrastructure quadrant at ring Trial

### Requirement: Penpot usage rule

A usage rule file SHALL be created at `.opencode/rules/technologies/penpot.md` documenting: the correct Helm chart name and repo URL, the namespace (`penpot`), local access pattern (Garden port-forwards, no ingress for dev), required `PENPOT_FLAGS` for local registration, and common troubleshooting steps for storage and database issues. The rule MUST include `created-by-change: adopt-penpot` in its frontmatter.

#### Scenario: Subagent can deploy Penpot from the rule alone

- **WHEN** a worker agent reads `.opencode/rules/technologies/penpot.md`
- **THEN** it has sufficient information to deploy or troubleshoot Penpot without referencing external documentation

### Requirement: Backstage catalog entity for Penpot

A Backstage catalog entity YAML SHALL be created at `.entities/penpot.yaml` of kind `Component`, type `service`, lifecycle `experimental`, with the system `staccato`, owned by `platform-team`, and annotated with `garden.io/deploy-action: penpot`. The entity SHALL include a link to the local Penpot URL (`http://localhost:3000`).

#### Scenario: Catalog entity is valid

- **WHEN** Backstage loads `.entities/penpot.yaml`
- **THEN** the Penpot component appears in the software catalog without validation errors
