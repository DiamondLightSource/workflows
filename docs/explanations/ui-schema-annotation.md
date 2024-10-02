# UI Schema Annotation

!!! note

    See also [Parameter Schema Annotations](./parameter-schema-annotations.md)

On `WorkflowTemplate`s (`workflowtemplates.argoproj.io`) and `ClusterWorkflowTemplate`s (`clusterworkflowtemplates.argoproj.io`) the `workflows.diamond.ac.uk/paramter-ui-schema` annotation (`metadata.annotations."workflows.diamond.ac.uk/parameter-ui-schema"`) is reserved for the specification of [JSON Forms UI Schema](https://jsonforms.io/docs/uischema/). The schema must supply a `Control` for each of the parameters available in the template.

The UI Schema is used to enhance layout in the `WorkflowTemplate`  and `ClusterWorkflowTemplate` submission forms. If no UI Schema is supplied the default [vertical layout](https://jsonforms.io/examples/layouts#vertical-layout) will be used.
