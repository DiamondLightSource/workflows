use super::{workflows::Workflow, VisitInput, CLIENT};
use crate::ArgoServerUrl;
use anyhow::anyhow;
use argo_workflows_openapi::APIResult;
use async_graphql::{
    connection::{Connection, CursorType, Edge, EmptyFields, OpaqueCursor},
    Context, Json, Object,
};
use axum_extra::headers::{authorization::Bearer, Authorization};
use schemars::schema::{InstanceType, Metadata, SchemaObject, SingleOrVec, StringValidation};
use serde::{Deserialize, Serialize, Serializer};
use serde_json::Value;
use std::{collections::HashMap, ops::Deref};
use tracing::{debug, instrument};

#[derive(Debug, thiserror::Error)]
#[allow(clippy::missing_docs_in_private_items)]
enum WorkflowTemplateParsingError {
    #[error(r#"metadata.labels."argocd.argoproj.io/instance" was expected but was not present"#)]
    MissingInstanceLabel,
    #[error(r#"{0} was expected but was not present"#)]
    MissingParameterSchemaAnnotation(String),
    #[error(r#"{annotation}" could not be parsed: {err}"#)]
    UnparsableParameterSchema {
        annotation: String,
        err: serde_json::Error,
    },
    #[error(r#"metadata.labels."workflows.diamond.ac.uk/ui-schema" could not be parsed: {0}"#)]
    UnparsableUiSchema(serde_json::Error),
}

/// A Template which specifies how to produce a [`Workflow`]
#[derive(Debug, derive_more::Deref, derive_more::From)]
struct WorkflowTemplate(argo_workflows_openapi::IoArgoprojWorkflowV1alpha1ClusterWorkflowTemplate);

#[Object]
impl WorkflowTemplate {
    /// The name given to the workflow template, globally unique
    async fn name(&self) -> &String {
        self.metadata.name.as_ref().unwrap()
    }

    /// The group who maintains the workflow template
    async fn maintainer(&self) -> Result<&String, WorkflowTemplateParsingError> {
        self.metadata
            .labels
            .get("argocd.argoproj.io/instance")
            .ok_or(WorkflowTemplateParsingError::MissingInstanceLabel)
    }

    /// A human readable title for the workflow template
    async fn title(&self) -> Option<&String> {
        self.metadata.annotations.get("workflows.argoproj.io/title")
    }

    /// A human readable description of the workflow which is created
    async fn description(&self) -> Option<&String> {
        self.metadata
            .annotations
            .get("workflows.argoproj.io/description")
    }

    /// A JSON Schema describing the arguments of a Workflow Template
    async fn arguments(&self) -> Result<Json<ArgumentSchema>, WorkflowTemplateParsingError> {
        Ok(Json(ArgumentSchema::new(
            &self.spec,
            &self.metadata.annotations,
        )?))
    }

    /// A JSON Forms UI Schema describing how to render the arguments of the Workflow Template
    async fn ui_schema(&self) -> Result<Option<Json<UiSchema>>, WorkflowTemplateParsingError> {
        Ok(UiSchema::new(&self.metadata.annotations)?.map(Json))
    }
}

/// A JSON Schema describing the arguments of a Workflow Template
#[derive(Debug, Default, Serialize, Deserialize)]
struct ArgumentSchema(SchemaObject);

impl ArgumentSchema {
    /// Adds a top level parameter to the schema
    fn add_parameter(
        &mut self,
        parameter: &argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Parameter,
        annotations: &HashMap<String, String>,
    ) -> Result<(), WorkflowTemplateParsingError> {
        let schema = match Self::get_annotation_schema(parameter.name.clone(), annotations) {
            Ok(schema) => Ok(schema),
            Err(WorkflowTemplateParsingError::MissingParameterSchemaAnnotation(_)) => {
                match parameter.enum_.as_slice() {
                    [] => Ok(Self::infer_string_schema(
                        parameter.description.as_ref(),
                        parameter.value.as_ref(),
                    )),
                    options => Ok(Self::infer_enum_schema(
                        parameter.description.as_ref(),
                        options,
                        parameter.value.as_ref(),
                    )),
                }
            }
            Err(err) => Err(err),
        }?;
        let validator = self.0.object();
        validator
            .properties
            .insert(parameter.name.clone(), schema.into());
        validator.required.insert(parameter.name.clone());
        Ok(())
    }

    /// Retrieves an parses a schema from an annotation of the form "workflows.diamond.ac.uk/parameter-schema.{name}"
    fn get_annotation_schema(
        name: String,
        annotations: &HashMap<String, String>,
    ) -> Result<SchemaObject, WorkflowTemplateParsingError> {
        let annotation = format!("workflows.diamond.ac.uk/parameter-schema.{name}");
        let schema = annotations.get(&annotation).ok_or(
            WorkflowTemplateParsingError::MissingParameterSchemaAnnotation(annotation.clone()),
        )?;
        serde_json::from_str::<SchemaObject>(schema).map_err(|err| {
            WorkflowTemplateParsingError::UnparsableParameterSchema { annotation, err }
        })
    }

    /// Creates a Schema for a parameter of [`InstanceType::String`], with an optional default value
    fn infer_string_schema(description: Option<&String>, default: Option<&String>) -> SchemaObject {
        SchemaObject {
            instance_type: Some(SingleOrVec::Single(Box::new(InstanceType::String))),
            metadata: Some(Box::new(Metadata {
                description: description.cloned(),
                default: default.cloned().map(Value::String),
                ..Default::default()
            })),
            string: Some(Box::new(StringValidation::default())),
            ..Default::default()
        }
    }

    /// Creates a Schema for a parameter of [`InstanceType::String`], with a set of predefined options and an optional default value
    fn infer_enum_schema(
        description: Option<&String>,
        options: &[String],
        default: Option<&String>,
    ) -> SchemaObject {
        SchemaObject {
            instance_type: Some(SingleOrVec::Single(Box::new(InstanceType::String))),
            metadata: Some(Box::new(Metadata {
                description: description.cloned(),
                default: default.cloned().map(Value::String),
                ..Default::default()
            })),
            enum_values: Some(options.iter().cloned().map(Value::String).collect()),
            ..Default::default()
        }
    }

    /// Create a [`ArgumentSchema`] from a Workflow Specification and associated annotations
    fn new(
        spec: &argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowSpec,
        annotations: &HashMap<String, String>,
    ) -> Result<Self, WorkflowTemplateParsingError> {
        let mut arguments_schema = ArgumentSchema::default();
        arguments_schema.0.instance_type =
            Some(SingleOrVec::Single(Box::new(InstanceType::Object)));
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

/// A JSON Forms UI Schema
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
#[allow(clippy::missing_docs_in_private_items)]
enum UiSchema {
    Control {
        scope: String,
        label: Option<String>,
    },
    HorizontalLayout {
        elements: Vec<UiSchema>,
    },
    VerticalLayout {
        elements: Vec<UiSchema>,
    },
    Group {
        label: String,
        elements: Vec<UiSchema>,
    },
    Categorization {
        elements: Vec<UiSchemaCategory>,
    },
}

impl UiSchema {
    /// Retrieves the UI Schema from the annotations on a [`WorkflowTemplate`], returns an error if parsing fails
    fn new(
        annotations: &HashMap<String, String>,
    ) -> Result<Option<Self>, WorkflowTemplateParsingError> {
        annotations
            .get("workflows.diamond.ac.uk/ui-schema")
            .map(|annotation| serde_json::from_str(annotation))
            .transpose()
            .map_err(WorkflowTemplateParsingError::UnparsableUiSchema)
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(clippy::missing_docs_in_private_items)]
struct UiSchemaCategory {
    #[serde(serialize_with = "UiSchemaCategory::r#type")]
    r#type: (),
    label: String,
    elements: Vec<UiSchema>,
}

impl UiSchemaCategory {
    #[allow(clippy::missing_docs_in_private_items)]
    fn r#type<S: Serializer>(_: &(), s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str("category")
    }
}

/// Queries related to [`WorkflowTemplate`]s
#[derive(Debug, Clone, Default)]
pub struct WorkflowTemplatesQuery;

#[Object]
impl WorkflowTemplatesQuery {
    #[instrument(skip(self, ctx))]
    async fn workflow_template(
        &self,
        ctx: &Context<'_>,
        name: String,
    ) -> anyhow::Result<WorkflowTemplate> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let mut url = server_url.clone();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "cluster-workflow-templates", &name]);
        debug!("Retrieving workflow template from {url}");
        let request = if let Some(auth_token) = auth_token {
            CLIENT.get(url).bearer_auth(auth_token.token())
        } else {
            CLIENT.get(url)
        };
        let workflow_templates =
            request
                .send()
                .await?
                .json::<APIResult<
                    argo_workflows_openapi::IoArgoprojWorkflowV1alpha1ClusterWorkflowTemplate,
                >>()
                .await?
                .into_result()?;
        Ok(workflow_templates.into())
    }

    #[instrument(skip(self, ctx))]
    async fn workflow_templates(
        &self,
        ctx: &Context<'_>,
        cursor: Option<String>,
        #[graphql(validator(minimum = 1, maximum = 10))] limit: Option<u32>,
    ) -> anyhow::Result<Connection<OpaqueCursor<usize>, WorkflowTemplate, EmptyFields, EmptyFields>>
    {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let mut url = server_url.clone();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "cluster-workflow-templates"]);
        let cursor_index = if let Some(cursor) = cursor {
            let cursor_index = OpaqueCursor::<usize>::decode_cursor(&cursor)
                .map_err(|err| anyhow!("Invalid Cursor: {err}"))?;
            url.query_pairs_mut()
                .append_pair("listOptions.continue", &cursor_index.0.to_string());
            cursor_index.0
        } else {
            0
        };
        debug!("Retrieving workflow templates from {url}");
        let request = if let Some(auth_token) = auth_token {
            CLIENT.get(url).bearer_auth(auth_token.token())
        } else {
            CLIENT.get(url)
        };
        let workflow_templates_response =
            request
                .send()
                .await?
                .json::<APIResult<
                    argo_workflows_openapi::IoArgoprojWorkflowV1alpha1ClusterWorkflowTemplateList,
                >>()
                .await?
                .into_result()?;
        let workflow_templates = workflow_templates_response
            .items
            .into_iter()
            .map(TryInto::try_into)
            .collect::<Result<Vec<_>, _>>()?;
        let mut connection = Connection::new(
            cursor_index > 0,
            workflow_templates_response.metadata.continue_.is_some(),
        );
        connection.edges.extend(
            workflow_templates
                .into_iter()
                .enumerate()
                .map(|(idx, template)| Edge::new(OpaqueCursor(cursor_index + idx + 1), template)),
        );
        Ok(connection)
    }
}

/// Mutations related to [`WorkflowTemplate`]s
#[derive(Debug, Clone, Default)]
pub struct WorkflowTemplatesMutation;

#[Object]
impl WorkflowTemplatesMutation {
    #[instrument(skip(self, ctx))]
    async fn submit_workflow_template(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: VisitInput,
        parameters: Json<HashMap<String, Value>>,
    ) -> anyhow::Result<Workflow> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let mut url = server_url.clone();
        let namespace = visit.to_string();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "workflows", &namespace, "submit"]);
        debug!("Submitting workflow template at {url}");
        let request = if let Some(auth_token) = auth_token {
            CLIENT.post(url).bearer_auth(auth_token.token())
        } else {
            CLIENT.post(url)
        }
        .json(
            &argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowSubmitRequest {
                namespace: Some(namespace),
                resource_kind: Some("ClusterWorkflowTemplate".to_string()),
                resource_name: Some(name),
                submit_options: Some(
                    argo_workflows_openapi::IoArgoprojWorkflowV1alpha1SubmitOpts {
                        annotations: None,
                        dry_run: None,
                        entry_point: None,
                        generate_name: None,
                        labels: None,
                        name: None,
                        owner_reference: None,
                        parameters: parameters
                            .0
                            .into_iter()
                            .filter_map(|(name, value)| to_argo_parameter(name, value).transpose())
                            .collect::<Result<Vec<_>, _>>()?,
                        pod_priority_class_name: None,
                        priority: None,
                        server_dry_run: None,
                        service_account: None,
                    },
                ),
            },
        );
        let workflow = request
            .send()
            .await?
            .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow>>()
            .await?
            .into_result()?;
        Ok(Workflow::new(workflow, visit.into())?)
    }
}

/// Convert a paramter into the format expected by the Argo Workflows API
fn to_argo_parameter(name: String, value: Value) -> Result<Option<String>, serde_json::Error> {
    Ok(match value {
        Value::Null => Ok(None),
        Value::Bool(bool) => Ok(Some(bool.to_string())),
        Value::Number(number) => Ok(Some(number.to_string())),
        Value::String(string) => Ok(Some(string)),
        Value::Array(vec) => serde_json::to_string(&vec).map(Some),
        Value::Object(map) => serde_json::to_string(&map).map(Some),
    }?
    .map(|parameter| format!("{name}={parameter}")))
}
