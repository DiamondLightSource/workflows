use derive_more::derive::{Deref, DerefMut, From, Into};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, HashMap};

#[derive(Debug, thiserror::Error)]
#[allow(clippy::missing_docs_in_private_items)]
pub(super) enum ParameterSchemaError {
    #[error(r#"{0} was expected but was not present"#)]
    MissingAnnotation(String),
    #[error(r#"{annotation}" could not be parsed: {err}"#)]
    Unparsable {
        annotation: String,
        err: serde_json::Error,
    },
    #[error("Malformed parameter schema")]
    MalformParameterSchema,
}

/// A JSON Schema, contents are expected to match Draft 2020-12
#[derive(Debug, PartialEq, Eq, Clone, From, Into, Deref, DerefMut, Serialize, Deserialize)]
pub(super) struct Schema(pub Value);

/// A JSON Schema describing the arguments of a Workflow Template
#[derive(Debug, Default)]
pub(super) struct ArgumentSchema(pub BTreeMap<String, Schema>);

impl Schema {
    /// Updates references within the schema to use a specified path prefix
    fn update_refs(&mut self, prefix: &str) {
        #[allow(clippy::missing_docs_in_private_items)]
        fn do_update(value: &mut Value, prefix: &str) {
            match value {
                Value::Object(ref mut schema) => {
                    if let Some(Value::String(reference)) = schema.get_mut("$ref") {
                        if let Some(reference_key) = reference.strip_prefix("#/") {
                            *reference = format!("#/properties/{prefix}/{reference_key}")
                        }
                    }
                    for value in schema.values_mut() {
                        do_update(value, prefix);
                    }
                }
                Value::Array(ref mut items) => items
                    .iter_mut()
                    .for_each(|schema| do_update(schema, prefix)),
                _ => {}
            }
        }
        do_update(&mut self.0, prefix);
    }
}

impl From<ArgumentSchema> for Schema {
    fn from(value: ArgumentSchema) -> Self {
        Self(json! ({
            "type": "object",
            "required": value.0.keys().collect::<Vec<_>>(),
            "properties": value.0.into_iter().map(|(name, mut schema)| {
                schema.update_refs(&name);
                (name, schema.0)
            }).collect::<BTreeMap<_, _>>(),
        }))
    }
}

impl ArgumentSchema {
    /// Adds a top level parameter to the schema
    fn add_parameter(
        &mut self,
        parameter: &argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Parameter,
        annotations: &HashMap<String, String>,
    ) -> Result<(), ParameterSchemaError> {
        let schema = match Self::get_annotation_schema(parameter.name.clone(), annotations) {
            Ok(schema) => Ok(schema),
            Err(ParameterSchemaError::MissingAnnotation(_)) => match parameter.enum_.as_slice() {
                [] => Ok(Self::infer_string_schema(
                    parameter.description.as_deref(),
                    parameter.value.as_deref(),
                    parameter.default.as_deref(),
                )),
                options => Ok(Self::infer_enum_schema(
                    parameter.description.as_deref(),
                    options,
                    parameter.value.as_deref(),
                    parameter.default.as_deref(),
                )),
            },
            Err(err) => Err(err),
        }?;
        self.0.insert(parameter.name.to_owned(), schema);
        Ok(())
    }

    /// Retrieves an parses a schema from an annotation of the form "workflows.diamond.ac.uk/parameter-schema.{name}"
    fn get_annotation_schema(
        name: String,
        annotations: &HashMap<String, String>,
    ) -> Result<Schema, ParameterSchemaError> {
        let annotation = format!("workflows.diamond.ac.uk/parameter-schema.{name}");
        let schema = annotations
            .get(&annotation)
            .ok_or(ParameterSchemaError::MissingAnnotation(annotation.clone()))?;
        serde_json::from_str(schema)
            .map_err(|err| ParameterSchemaError::Unparsable { annotation, err })
    }

    /// Creates a Schema for a parameter of [`InstanceType::String`], with an optional default value
    fn infer_string_schema(
        description: Option<&str>,
        value: Option<&str>,
        default: Option<&str>,
    ) -> Schema {
        let mut contents = Map::new();
        contents.insert("type".to_string(), "string".into());
        if let Some(description) = description {
            contents.insert("description".to_string(), description.into());
        }
        if let Some(default) = value.or(default) {
            contents.insert("default".to_string(), default.into());
        }
        Schema(Value::Object(contents))
    }

    /// Creates a Schema for a parameter of [`InstanceType::String`], with a set of predefined options and an optional default value
    fn infer_enum_schema(
        description: Option<&str>,
        options: &[String],
        value: Option<&str>,
        default: Option<&str>,
    ) -> Schema {
        let mut contents = Map::new();
        contents.insert("type".to_string(), "string".into());
        contents.insert("enum".to_string(), options.into());
        if let Some(description) = description {
            contents.insert("description".to_string(), description.into());
        }
        if let Some(default) = value.or(default) {
            contents.insert("default".to_string(), default.into());
        }
        Schema(Value::Object(contents))
    }

    /// Create a [`ArgumentSchema`] from a Workflow Specification and associated annotations
    pub(super) fn new(
        spec: &argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowSpec,
        annotations: &HashMap<String, String>,
    ) -> Result<Self, ParameterSchemaError> {
        let mut arguments_schema = ArgumentSchema::default();
        if let Some(arguments) = &spec.arguments {
            for parameter in arguments.parameters.clone() {
                if parameter.value_from.is_none() {
                    arguments_schema.add_parameter(&parameter, annotations)?;
                }
            }
        }
        if let Some(entrypoint) = &spec.entrypoint {
            if let Some(template) = spec.templates.iter().find(|template| {
                template
                    .name
                    .as_ref()
                    .is_some_and(|name| name == entrypoint)
            }) {
                if let Some(inputs) = &template.inputs {
                    for parameter in &inputs.parameters {
                        if parameter.value_from.is_none() {
                            arguments_schema.add_parameter(parameter, annotations)?;
                        }
                    }
                }
            }
        }
        Ok(arguments_schema)
    }
}

#[cfg(test)]
mod tests {
    use super::{ArgumentSchema, Schema};
    use argo_workflows_openapi::{
        IoArgoprojWorkflowV1alpha1Arguments, IoArgoprojWorkflowV1alpha1Parameter,
        IoArgoprojWorkflowV1alpha1ValueFrom, IoArgoprojWorkflowV1alpha1WorkflowSpec,
        IoK8sApiCoreV1ConfigMapKeySelector,
    };
    use serde_json::json;
    use std::collections::HashMap;

    #[test]
    fn empty() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters([])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::new();
        let expected = json!({
            "type": "object",
            "properties": {},
            "required": []
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn string_inferred() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters([IoArgoprojWorkflowV1alpha1Parameter::builder()
                        .name("foo")
                        .description(Some("A metasyntactic variable".to_string()))
                        .try_into()
                        .unwrap()])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::new();
        let expected = json!({
            "type": "object",
            "properties": {
                "foo": {
                    "type": "string",
                    "description": "A metasyntactic variable",
                }
            },
            "required": [
                "foo"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn string_inferred_with_default() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters([IoArgoprojWorkflowV1alpha1Parameter::builder()
                        .name("foo")
                        .default(Some("bar".to_string()))
                        .try_into()
                        .unwrap()])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::new();
        let expected = json!({
            "type": "object",
            "properties": {
                "foo": {
                    "type": "string",
                    "default": "bar"
                }
            },
            "required": [
                "foo"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn string_inferred_with_value_default() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters([IoArgoprojWorkflowV1alpha1Parameter::builder()
                        .name("foo")
                        .value(Some("bar".to_string()))
                        .try_into()
                        .unwrap()])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::new();
        let expected = json!({
            "type": "object",
            "properties": {
                "foo": {
                    "type": "string",
                    "default": "bar"
                }
            },
            "required": [
                "foo"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn enum_inferred() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters([IoArgoprojWorkflowV1alpha1Parameter::builder()
                        .name("foo")
                        .description(Some("A metasyntactic variable".to_string()))
                        .enum_(["bar".to_string(), "baz".to_string()])
                        .try_into()
                        .unwrap()])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::new();
        let expected = json!({
            "type": "object",
            "properties": {
                "foo": {
                    "type": "string",
                    "description": "A metasyntactic variable",
                    "enum": [
                        "bar",
                        "baz"
                    ]
                }
            },
            "required": [
                "foo"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn enum_inferred_with_default() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters([IoArgoprojWorkflowV1alpha1Parameter::builder()
                        .name("foo")
                        .default(Some("bar".to_string()))
                        .enum_(["bar".to_string(), "baz".to_string()])
                        .try_into()
                        .unwrap()])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::new();
        let expected = json!({
            "type": "object",
            "properties": {
                "foo": {
                    "type": "string",
                    "default": "bar",
                    "enum": [
                        "bar",
                        "baz"
                    ]
                }
            },
            "required": [
                "foo"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn enum_inferred_with_value_default() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters([IoArgoprojWorkflowV1alpha1Parameter::builder()
                        .name("foo")
                        .value(Some("bar".to_string()))
                        .enum_(["bar".to_string(), "baz".to_string()])
                        .try_into()
                        .unwrap()])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::new();
        let expected = json!({
            "type": "object",
            "properties": {
                "foo": {
                    "type": "string",
                    "default": "bar",
                    "enum": [
                        "bar",
                        "baz"
                    ]
                }
            },
            "required": [
                "foo"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn annotation_used() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters(vec![IoArgoprojWorkflowV1alpha1Parameter::builder()
                        .name("foo")
                        .try_into()
                        .unwrap()])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::from([(
            "workflows.diamond.ac.uk/parameter-schema.foo".to_string(),
            json!({
                "type": "integer",
                "default": 9001
            })
            .to_string(),
        )]);
        let expected = json!({
            "type": "object",
            "properties": {
                "foo": {
                    "type": "integer",
                    "default": 9001
                }
            },
            "required": [
                "foo"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn schemas_stitched() {
        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters(vec![
                        IoArgoprojWorkflowV1alpha1Parameter::builder()
                            .name("foo")
                            .try_into()
                            .unwrap(),
                        IoArgoprojWorkflowV1alpha1Parameter::builder()
                            .name("bar")
                            .try_into()
                            .unwrap(),
                        IoArgoprojWorkflowV1alpha1Parameter::builder()
                            .name("baz")
                            .enum_(["fizz".to_string(), "buzz".to_string()])
                            .try_into()
                            .unwrap(),
                    ])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::from([(
            "workflows.diamond.ac.uk/parameter-schema.foo".to_string(),
            json!({
                "type": "integer",
                "default": 9001
            })
            .to_string(),
        )]);
        let expected = json!({
            "type": "object",
            "properties": {
                "foo": {
                    "type": "integer",
                    "default": 9001
                },
                "bar": {
                    "type": "string",
                },
                "baz": {
                    "type": "string",
                    "enum": [
                        "fizz",
                        "buzz"
                    ]
                }
            },
            "required": [
                "bar",
                "baz",
                "foo"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }

    #[test]
    fn ignore_parameters_from_mounts() {
        let configmap_selector = IoK8sApiCoreV1ConfigMapKeySelector::builder()
            .name(Some("some-configmap".to_string()))
            .key("some-key".to_string())
            .optional(Some(false))
            .try_into()
            .unwrap();

        let configmap_reference = IoArgoprojWorkflowV1alpha1ValueFrom::builder()
            .config_map_key_ref(Some(configmap_selector))
            .try_into()
            .unwrap();

        let spec = IoArgoprojWorkflowV1alpha1WorkflowSpec::builder()
            .arguments(Some(
                IoArgoprojWorkflowV1alpha1Arguments::builder()
                    .parameters([
                        IoArgoprojWorkflowV1alpha1Parameter::builder()
                            .name("foo")
                            .value_from(Some(configmap_reference))
                            .try_into()
                            .unwrap(),
                        IoArgoprojWorkflowV1alpha1Parameter::builder()
                            .name("bar")
                            .try_into()
                            .unwrap(),
                    ])
                    .try_into()
                    .unwrap(),
            ))
            .try_into()
            .unwrap();
        let annotations = HashMap::new();
        let expected = json!({
            "type": "object",
            "properties": {
                "bar": {
                    "type": "string",
                }
            },
            "required": [
                "bar"
            ]
        });
        assert_eq!(
            Schema(expected),
            Schema::from(ArgumentSchema::new(&spec, &annotations).unwrap())
        )
    }
}
