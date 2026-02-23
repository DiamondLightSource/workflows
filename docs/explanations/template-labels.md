
# Workflow Template Filters & Metadata

Workflow templates can take extra metadata in the form of labels and annotations. These metadata are used in the
[template list page](https://workflows.diamond.ac.uk/templates) to present the templates.

All metadata fields are optional, but we suggest you add as many as possible for full filtering and visibility.

## Labels

These are used in the `labels` field of the template.

| Label | Syntax | Definition |
|-------|--------|------------|
| Science Group | workflows.diamond.ac.uk/science-group-*[extension]*: "true" | The science group who authored the template. *[Extension]* must be substituted for one of: <ul><li>bio-cryo-imaging</li><li>condensed-matter</li><li>crystallography</li><li>imaging</li><li>magnetic-materials</li><li>mx</li><li>spectroscopy</li><li>surfaces</li><ul/>|

### In development

Beamline - filter templates based on the beamline(s) that they are associated with.

Custom tags - filter templates based on a custom tag. Possibly experimental technique?

## Annotations

These are instead applied under the `annotations` field in the template.

| Tag                                      | Definition                                    |
| ---------------------------------------- | --------------------------------------------- |
| workflows.argoproj.io/title              | The title of the workflow as shown in the UI. |
| workflows.argoproj.io/description        | A description of what the templal do.         |
| workflows.diamond.ac.uk/repository       | Source repository for template.               |
| workflows.diamond.ac.uk/ui-schema        | Json-forms schema describing template UI      |
| workflows.diamond.ac.uk/parameter-schema | Json-forms schema describing parameters       |

## Example

An example snippet is provided below to demonstrate how to add metadata:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: conditional-steps
  labels:
    workflows.diamond.ac.uk/science-group-examples: "true"
  annotations:
    workflows.argoproj.io/title: conditional-steps
    workflows.argoproj.io/description: |
      Run steps based on conditions from previous outputs.
    workflows.diamond.ac.uk/repository: "https://github.com/DiamondLightSource/workflows"
spec:
  entrypoint: workflow-entry
```