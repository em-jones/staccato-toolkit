---
td-board: kubernetes-ui-tool-selection-tool-evaluation
td-issue: td-8a3a90
---

# Specification: Tool Evaluation

## Overview

This spec defines the requirements for evaluating candidate Kubernetes UI tools and producing a
structured recommendation. The evaluation covers Headlamp, Lens, Octant, and the upstream
Kubernetes Dashboard, assessed against criteria relevant to the platform's local-development,
KubeVela CRD, and CNCF-alignment context.

## ADDED Requirements

### Requirement: Selection criteria definition

The platform SHALL define explicit, weighted selection criteria before comparing tools, so that
the decision is reproducible and auditable.

#### Scenario: Criteria are documented prior to comparison

- **WHEN** a developer reads the evaluation document
- **THEN** they SHALL find a documented list of criteria (e.g., licence, extensibility,
  local-dev fit, CRD/KubeVela support, CNCF alignment, active maintenance) each with a
  stated rationale

#### Scenario: Criteria cover open-source licence requirements

- **WHEN** a tool is evaluated
- **THEN** the evaluation SHALL verify the tool is licensed under an OSI-approved open-source
  licence (Apache 2.0, MIT, or equivalent)

### Requirement: Tool comparison matrix

The evaluation SHALL produce a structured comparison matrix covering all candidate tools against
all defined criteria.

#### Scenario: All candidate tools are evaluated

- **WHEN** the comparison matrix is reviewed
- **THEN** it SHALL include rows for Headlamp, Lens (open-source edition), Octant, and
  Kubernetes Dashboard

#### Scenario: Matrix includes local-dev installation method

- **WHEN** a developer reads the matrix
- **THEN** each tool row SHALL specify whether it can be installed via devbox, Helm, or
  binary download, and whether it requires a cluster-side component

#### Scenario: Matrix includes KubeVela / CRD awareness

- **WHEN** a developer reads the matrix
- **THEN** each tool row SHALL state whether it can display custom resources (CRDs) natively
  or via a plugin/extension

#### Scenario: Matrix includes extensibility mechanism

- **WHEN** a developer reads the matrix
- **THEN** each tool row SHALL describe the plugin or extension mechanism (if any)

### Requirement: Tool recommendation and decision

The evaluation SHALL conclude with an explicit recommendation that identifies the selected tool
and justifies the choice against the comparison matrix.

#### Scenario: Recommendation is unambiguous

- **WHEN** a developer reads the evaluation conclusion
- **THEN** they SHALL find a single tool identified as the selected choice with a clear
  rationale referencing the criteria and matrix

#### Scenario: Rejected alternatives are documented

- **WHEN** a developer reads the evaluation
- **THEN** each non-selected tool SHALL have a brief note explaining why it was not chosen
