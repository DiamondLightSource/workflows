# Workflow Types and Priorities

## Overview

The `workflows.diamond.ac.uk/type` annotation is used to classify workflows and determine the workload priority assigned when a workflow is submitted.

This annotation helps the scheduling system distinguish between production, live-processing, and test workloads.

## Available Values

```yaml
workflows.diamond.ac.uk/type: standard
```

| Type | Priority Class | Intended Use |
|--------|--------|--------|
| `standard` (or unset) | `medium` | Normal workflow execution |
| `live` | `high` | Time-critical live processing |
| `test` | `low` | Development and testing workloads |

## Live Workflows

Live workflows are intended for beamline processing where a user is actively waiting for results.

Examples include:

- Processing data during acquisition.
- Interactive experiments requiring rapid feedback.
- Automated processing that must complete as soon as possible so users can make decisions while at the beamline.

These workflows are assigned the `high` priority class so they can be scheduled ahead of less urgent workloads.

## Choosing the Correct Workflow Type

### `live`

Use `live` when immediate processing is required for an ongoing experiment and users are actively waiting for results.

### `standard`

Use `standard` (or leave the annotation unset) for normal production workloads that do not require expedited scheduling.

### `test`

Use `test` for development, validation, experimentation, and non-production workloads that should not compete with operational processing.

!!! warning "Use Live Sparingly"
    Workflows should only be marked as `live` when there is a genuine operational need for expedited scheduling. Overuse of the `live` type may reduce the effectiveness of workload prioritisation.

## Important: Workflow vs ClusterWorkflowTemplate Annotations

Workload priority policies are evaluated against submitted **Workflow** resources, not **ClusterWorkflowTemplate** resources.

Adding the following annotation to a `ClusterWorkflowTemplate`:

```yaml
metadata:
  annotations:
    workflows.diamond.ac.uk/type: "live"
```

provides guidance to users and indicates the intended use of the template. However, it does **not** automatically cause workflows created from that template to receive high-priority scheduling.

To receive the `high` priority class, the annotation must also be present on the submitted **Workflow** resource.

## Example Workflow

The `surface-analysis` example `ClusterWorkflowTemplate` demonstrates a workflow intended for live processing.

When submitting a workflow from the template, include the annotation on the workflow itself:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: surface-analysis-live-
  annotations:
    workflows.diamond.ac.uk/type: "live"

spec:
  workflowTemplateRef:
    name: surface-analysis
    clusterScope: true

  arguments:
    parameters:
      - name: sample
        value: beamline-sample-001
```

Because the annotation is present on the **Workflow**, the workload is assigned the following priority class:

```yaml
kueue.x-k8s.io/priority-class: high
```

## Summary

- `standard` (or unset) → `medium` priority.
- `live` → `high` priority.
- `test` → `low` priority.
- The annotation on a `ClusterWorkflowTemplate` is informational and documents the intended usage.
- The annotation must be present on the submitted **Workflow** resource for workload priority policies to take effect.
- See the `surface-analysis` example for a reference implementation of a live-processing workflow.
