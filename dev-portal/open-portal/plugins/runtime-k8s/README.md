# @op-plugin/runtime-k8s

Kubernetes integration plugin for OpenPort.

## Overview

The Kubernetes plugin uses metadata labels to associate Kubernetes resources with catalog entities.
No CRDs or Kubernetes API extensions are required.

## Label Scheme

```yaml
# Applied to Kubernetes resources
labels:
  staccato.io/catalog-entity: payment-service
  staccato.io/catalog-kind: component

annotations:
  staccato.io/catalog-entity-uid: <uuid>
  staccato.io/owner-team: <team-id>
```

## Views

1. **Catalog-first**: Browse by catalog entity → see associated K8s resources
2. **Resource-first**: Browse by K8s resource type → filter with catalog entity links

## Capabilities

- Kubernetes resource browsing (read-only)
- Pod log streaming
- Resource status and event inspection
- Entity ↔ K8s resource cross-linking via labels

## References

- [OPEN_PORTAL.md](../../../../OPEN_PORTAL.md)
