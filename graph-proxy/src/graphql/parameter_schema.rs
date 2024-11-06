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
}

/// A JSON Schema, contents are expected to match Draft 2020-12
#[derive(Debug, Clone, From, Into, Deref, DerefMut, Serialize, Deserialize)]
pub(super) struct Schema(Value);

/// A JSON Schema describing the arguments of a Workflow Template
#[derive(Debug, Default)]
pub(super) struct ArgumentSchema(BTreeMap<String, Schema>);

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
                arguments_schema.add_parameter(&parameter, annotations)?;
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
                        arguments_schema.add_parameter(parameter, annotations)?;
                    }
                }
            }
        }
        Ok(arguments_schema)
    }
}
