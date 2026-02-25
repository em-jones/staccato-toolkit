---
td-board: adopt-component-platform-kubevela-adoption-rationale
td-issue: td-9cf867
---

# Specification: KubeVela Adoption Rationale

## Overview

Defines requirements for the design document that makes the case for adopting KubeVela as the component specification tool, and documents the tool selection decision against alternatives.

## ADDED Requirements

### Requirement: Component specification tool selection is documented

The platform SHALL include a design document that articulates why KubeVela is the appropriate component specification tool, covering the problem it solves, the alternatives considered (Radius, raw Helm, Crossplane), and the decision outcome.

#### Scenario: Rationale addresses platform toolkit context

- **WHEN** a developer or architect reads the design document
- **THEN** they SHALL understand why a platform toolkit benefits from a component specification layer above raw Kubernetes, and why KubeVela specifically was chosen

#### Scenario: Alternatives are compared

- **WHEN** a reviewer reads the design document
- **THEN** they SHALL find a clear comparison of KubeVela against at least: Radius, raw Helm, and Crossplane, with rejection reasons for each

### Requirement: Open Application Model alignment is documented

The design document SHALL explain KubeVela's relationship to the Open Application Model (OAM) standard and why OAM alignment is a decision criterion.

#### Scenario: OAM standard is explained

- **WHEN** a developer reads the design
- **THEN** they SHALL understand what OAM is, why it matters for portability and vendor neutrality, and how KubeVela implements it
