---
status: accepted
date: 2026-02-28
decision-makers: [platform-architect]
component: src/ops/penpot

tech-radar:
  - name: Penpot
    quadrant: Infrastructure
    ring: Trial
    description: Open-source, self-hosted UI/UX design and prototyping platform. Deployed via Helm on kind-staccato-dev for collaborative design work alongside development workflows.
    moved: 1

td-board: adopt-penpot
td-issue: td-c336b6
---

# Design: Adopt Penpot — UI Design Platform

## Context and problem statement

Penpot files already exist in `src/ops/penpot/` (garden.yml, values.yaml, README.md) but were created without going through the OpenSpec adoption workflow. The existing `garden.yml` references the wrong Helm chart repo URL (`https://penpot.app/helm-charts`) — the correct URL is `https://helm.penpot.app`. The ingress configuration in `values.yaml` references cert-manager and nginx ingress which are not installed in the local dev cluster; Garden port-forwards should be used instead. This design formalises the adoption, fixes the integration, and adds the required platform artifacts (usage rule, catalog entity, tech radar entry).

## Decision criteria

This design achieves:

- **Correct Garden/Helm integration** (100%): Fix chart repo URL, disable ingress for dev, validate port-forwards
- **Formal platform adoption** (100%): Usage rule, tech radar entry, catalog entity

Explicitly excludes:

- Production-grade TLS/ingress configuration (local dev only)
- Redis session management (disabled — not needed for local dev)
- SMTP/email configuration (not needed for local-only use)

## Considered options

### Option 1: Helm chart from `https://penpot.app/helm-charts` (current)

The existing `garden.yml` uses this URL. **Rejected**: this URL returns a 404 — the chart is not served from this endpoint.

### Option 2: Helm chart from `https://helm.penpot.app` (official)

The official Penpot Helm chart is served from `https://helm.penpot.app`. **Adopted**: confirmed reachable, returns a valid `index.yaml`.

### Option 3: Docker Compose via Garden exec action

Penpot provides an official Docker Compose setup. **Rejected**: inconsistent with the platform's Kubernetes-first approach; all platform services run on `kind-staccato-dev`.

## Decision outcome

Deploy Penpot via the official Helm chart at `https://helm.penpot.app` using a Garden `Deploy` action (type: `helm`). Disable ingress; expose services via Garden port-forwards. Use bundled PostgreSQL. Disable Redis for local dev. Set `PENPOT_FLAGS=enable-registration enable-login` so developers can create local accounts.

## Risks / trade-offs

- Risk: Penpot Helm chart values schema may differ from what `values.yaml` currently expects → Mitigation: validate against actual chart `values.yaml` from `https://helm.penpot.app` during implementation; adjust keys accordingly
- Trade-off: bundled PostgreSQL is not HA — acceptable for local dev, not suitable for production
- Risk: 10Gi asset PVC may exhaust kind node disk space on low-storage machines → Mitigation: document minimum node disk requirement in usage rule

## Migration plan

1. Update `src/ops/penpot/garden.yml`: fix `chart.repo` to `https://helm.penpot.app`; remove or fix port-forward service names to match actual chart service names
2. Update `src/ops/penpot/values.yaml`: disable ingress, remove TLS/cert-manager annotations, add `PENPOT_FLAGS`
3. Add Penpot to `docs/tech-radar.json` (Trial, Infrastructure)
4. Create `.opencode/rules/technologies/penpot.md`
5. Create `.entities/penpot.yaml` Backstage catalog entity
6. Validate with `garden deploy --env local deploy.penpot` then `garden test test.penpot-health-check`

Rollback: `garden cleanup namespace.penpot` removes all Penpot resources from the cluster.

## Confirmation

- `garden deploy --env local deploy.penpot` completes without error
- `kubectl get pods -n penpot --context kind-staccato-dev` shows all pods Running
- `kubectl get pvc -n penpot --context kind-staccato-dev` shows all PVCs Bound
- `garden test test.penpot-health-check` exits 0
- `http://localhost:3000` returns the Penpot login page

## Open questions

- None — chart values schema can be resolved during implementation from the live chart

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Penpot | platform-architect | `.opencode/rules/technologies/penpot.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Penpot | worker | — | none | Penpot is a deployed service, not an agent workflow; a usage rule is sufficient |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | penpot | create | platform-team | `.entities/penpot.yaml` | declared | Penpot is a deployed platform service and should appear in the software catalog |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| penpot | n/a | n/a | none | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
