# Parameter Schema Annotations

!!! note

    See also [UI Schema Annotations](./ui-schema-annotation.md)

On `WorkflowTemplate`s (`workflowtemplates.argoproj.io`) and `ClusterWorkflowTemplate`s (`clusterworkflowtemplates.argoproj.io`) annotations prefixed with `workflows.diamond.ac.uk/parameter-schema` annotations with a dot separated of the parameter name (e.g. `metadata.annotations."workflows.diamond.ac.uk/parameter-schema.num-cores"`) are reserved for the specification of a parameter [JSON Schema](https://json-schema.org/).

The Schema is used to enhance type checking in the `WorkflowTemplate` and `ClusterWorkflowTemplate` submission forms. If no Schema is supplied one will be automatically generated in which parameters will be assumed to be of type `String` or `Enum` depending on whether they contain the `enum` declaration.
