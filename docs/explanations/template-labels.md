# Workflow Template Filters & Metadata

Workflow templates can take extra metadata, often in the form of labels in their manifests.
These labels are used by the system to apply filters when viewing workflow templates.

Some are labels, some are annotations - see the table below for a list of useful
tags, and where to use them.

All labels are optional, but we suggest you add as many as possible for full filtering and viewing.

## Filters
| Filter | Definition | Location in Manifest |
|--------|------------|------|
| workflows.diamond.ac.uk/science-group | The science group who authored the template. One of: mx, magnetic-materials, spectroscopy, crystallography.  | Label |

Science group - filter by existence of tag for specific group

Beamline - bool

Custom tags - 

## Metadata
| Tag | Definition | Location in Manifest |
|--------|------------|------|
| workflows.argoproj.io/title | The title of the workflow as shown in the UI. | Annotation |
| workflows.argoproj.io/description | A description of what the template will do. | Annotation |
| workflows.diamond.ac.uk/repository | Source repository for template. | Annotation |
| workflows.diamond.ac.uk/ui-schema | Json-forms schema describing template UI | Annotation |
| workflows.diamond.ac.uk/parameter-schema | Json-forms schema describing parameters | Annotation |

An example snippet is provided below to demonstrate how to add these labels:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: conditional-steps
  labels:
    workflows.diamond.ac.uk/science-group: workflows-examples
    workflows.argoproj.io/title: conditional-steps
    workflows.argoproj.io/description: |
      Run steps based on conditions from previous outputs.
    workflows.diamond.ac.uk/repository: "https://github.com/DiamondLightSource/workflows"
spec:
  entrypoint: workflow-entry
```
