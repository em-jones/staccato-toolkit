---
td-board: open-portal-phase-1-kubernetes-plugin
td-issue: td-c9a223
---

# Specification: Kubernetes Plugin

## Overview

Defines the Kubernetes integration plugin for OpenPort. The plugin uses `staccato.io/*` metadata
labels to associate K8s resources with catalog entities. In Phase 1 the Kubernetes API is replaced
by a local fixture server that returns deterministic mock data, enabling development without a
running cluster.

## ADDED Requirements

### Requirement: K8s API client abstraction

The `packages/k8s` package SHALL define a `KubernetesClient` interface with methods:
`listResources(kind, namespace?)`, `getResource(kind, name, namespace)`, and
`streamPodLogs(podName, namespace)`. A `MockKubernetesClient` implementation SHALL be provided
that returns fixture data from static JSON files under `packages/k8s/fixtures/`. The active
implementation SHALL be selected via the `OPENPORT_K8S_MOCK=true` environment variable.

#### Scenario: Mock client returns fixture deployments

- **WHEN** `OPENPORT_K8S_MOCK=true` and `listResources("Deployment")` is called
- **THEN** the mock returns the deployments defined in
  `packages/k8s/fixtures/deployments.json` without network I/O

#### Scenario: Real client path compiles

- **WHEN** `OPENPORT_K8S_MOCK=false` (or unset) and the application is built
- **THEN** the build succeeds and the real client wires to the in-cluster or kubeconfig credential

### Requirement: Label-based entity correlation

The plugin SHALL scan K8s resources for the labels `staccato.io/catalog-entity` and
`staccato.io/catalog-kind`. When present, the plugin SHALL link the K8s resource to the
corresponding catalog entity. Resources without these labels SHALL still appear in the browser
but without a catalog link.

#### Scenario: Labelled deployment linked to catalog entity

- **WHEN** a `Deployment` carries `staccato.io/catalog-entity: payment-service` and
  `staccato.io/catalog-kind: component`
- **THEN** the K8s resource browser shows a "Catalog: payment-service" link on that deployment

#### Scenario: Unlabelled resources shown without link

- **WHEN** a `Pod` has no `staccato.io/*` labels
- **THEN** it appears in the resource browser with no catalog link and no error

### Requirement: Read-only resource browser server functions

TanStack Start server functions SHALL expose: list resources by kind (Deployments, Services, Pods,
ReplicaSets), get a single resource, and stream pod logs. All endpoints SHALL require `catalog.read`
permission. No write operations (create, update, delete) SHALL be exposed.

#### Scenario: List deployments returns expected shape

- **WHEN** a GET to the deployments listing server function is made by a `viewer`-role user
- **THEN** an array of `{name, namespace, status, catalogEntity?, catalogKind?}` objects is
  returned

#### Scenario: Write attempt blocked

- **WHEN** any K8s mutating operation is attempted via the server functions
- **THEN** the request is rejected with HTTP 405 (Method Not Allowed)

### Requirement: Pod log streaming

The plugin SHALL expose a server-sent events (SSE) endpoint that streams pod logs in real time.
The mock implementation SHALL replay a static log fixture line by line with a configurable delay.

#### Scenario: Mock log stream emits fixture lines

- **WHEN** `OPENPORT_K8S_MOCK=true` and the pod log SSE endpoint is connected
- **THEN** lines from the log fixture are emitted as SSE events at a rate of ~10 lines/second

### Requirement: Catalog-first and resource-first views

The UI SHALL provide two complementary drill-down views for Kubernetes data: catalog-first (select
a catalog entity → see associated K8s resources) and resource-first (select a K8s resource type →
browse all resources with optional entity filter).

#### Scenario: Catalog-first view shows associated resources

- **WHEN** a user navigates to a `Component` entity detail page
- **THEN** a "Kubernetes" tab lists all K8s resources labelled with that component's name
