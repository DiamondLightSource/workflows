use super::{
    parameter_schema::{ArgumentSchema, ParameterSchemaError, Schema},
    ui_schema::{UiSchema, UiSchemaError},
    workflows::Workflow,
    VisitInput, CLIENT,
};
use crate::{graphql::filters::WorkflowTemplatesFilter, ArgoServerUrl};
use anyhow::anyhow;
use argo_workflows_openapi::APIResult;
use async_graphql::{
    connection::{Connection, CursorType, Edge, EmptyFields, OpaqueCursor},
    Context, Json, Object, SimpleObject,
};
use axum_extra::headers::{authorization::Bearer, Authorization};
use kube::{
    api::{ApiResource, DynamicObject},
    core::GroupVersionKind,
    Api, Client,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, ops::Deref};
use tracing::{debug, instrument};

#[derive(Debug, thiserror::Error)]
#[allow(clippy::missing_docs_in_private_items)]
enum WorkflowTemplateParsingError {
    #[error(r#"metadata.labels."argocd.argoproj.io/instance" was expected but was not present"#)]
    MissingInstanceLabel,
    #[error("Could not parse parameter schema")]
    ParameterSchemaError(#[from] ParameterSchemaError),
    #[error("Could not parse UI schema")]
    UiSchemaError(#[from] UiSchemaError),
    #[error("Could not parse parameter schema {0}")]
    MalformParameterSchema(#[from] serde_json::Error),
}

/// Information about where the template is stored
#[derive(Debug, Serialize, Deserialize, SimpleObject, PartialEq)]
struct TemplateSource {
    #[serde(rename(deserialize = "repoURL"))]
    /// The URL of the GitHub repository
    repository_url: String,
    /// The path to the template within the repository
    path: String,
    #[serde(rename(deserialize = "targetRevision"))]
    /// The current tracked branch of the repository
    target_revision: String,
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

    /// The repository storing the code associated with this template.
    async fn repository(&self) -> Option<&String> {
        self.metadata
            .annotations
            .get("workflows.diamond.ac.uk/repository")
    }

    /// A JSON Schema describing the arguments of a Workflow Template
    async fn arguments(&self) -> Result<Json<Value>, WorkflowTemplateParsingError> {
        match self
            .0
            .metadata
            .annotations
            .get("workflows.diamond.ac.uk/parameter-schema")
        {
            Some(schema) => serde_json::from_str(schema)
                .map_err(WorkflowTemplateParsingError::MalformParameterSchema),
            None => Ok(Json(
                Schema::from(ArgumentSchema::new(&self.spec, &self.metadata.annotations)?).into(),
            )),
        }
    }

    /// A JSON Forms UI Schema describing how to render the arguments of the Workflow Template
    async fn ui_schema(&self) -> Result<Option<Json<UiSchema>>, WorkflowTemplateParsingError> {
        Ok(UiSchema::new(&self.metadata.annotations)?.map(Json))
    }

    /// Information about where the template is obtained from
    async fn template_source(
        &self,
    ) -> Result<Option<TemplateSource>, WorkflowTemplateParsingError> {
        let instance = match self.metadata.labels.get("argocd.argoproj.io/instance") {
            Some(val) => val,
            None => return Err(WorkflowTemplateParsingError::MissingInstanceLabel),
        };

        let client = Client::try_default().await.unwrap();
        let gvk = GroupVersionKind::gvk("argoproj.io", "v1alpha1", "application");
        let api = Api::<DynamicObject>::namespaced_with(
            client,
            "argocd",
            &ApiResource::from_gvk_with_plural(&gvk, "applications"),
        );

        let obj = match api.get(instance).await {
            Ok(obj) => obj,
            Err(_) => return Ok(None),
        };

        let data = obj
            .data
            .get("spec")
            .and_then(|s| s.get("source"))
            .cloned()
            .unwrap_or(Value::Null);

        match serde_json::from_value(data) {
            Ok(source) => Ok(Some(source)),
            Err(_) => Ok(None),
        }
    }
}

/// Queries related to [`WorkflowTemplate`]s
#[derive(Debug, Clone, Default)]
pub struct WorkflowTemplatesQuery;

#[Object]
impl WorkflowTemplatesQuery {
    #[instrument(name = "graph_proxy_workflow_template", skip(self, ctx))]
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

    #[instrument(name = "graph_proxy_workflow_templates", skip(self, ctx))]
    async fn workflow_templates(
        &self,
        ctx: &Context<'_>,
        cursor: Option<String>,
        #[graphql(validator(minimum = 1, maximum = 100))] limit: Option<u32>,
        filter: Option<WorkflowTemplatesFilter>,
    ) -> anyhow::Result<Connection<OpaqueCursor<usize>, WorkflowTemplate, EmptyFields, EmptyFields>>
    {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let mut url = server_url.clone();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "cluster-workflow-templates"]);
        let limit = limit.unwrap_or(100);
        url.query_pairs_mut()
            .append_pair("listOptions.limit", &limit.to_string());

        if let Some(filter) = filter {
            filter.generate_filters(&mut url);
        }
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

        let api_result =
            request
                .send()
                .await?
                .json::<APIResult<
                    argo_workflows_openapi::IoArgoprojWorkflowV1alpha1ClusterWorkflowTemplateList,
                >>()
                .await?;

        let workflow_templates_response = match api_result.into_result() {
            Ok(res) => res,
            Err(_) => {
                return Ok(Connection::new(false, false));
            }
        };

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
    #[instrument(name = "graph_proxy_submit_workflow_template", skip(self, ctx))]
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
        Ok(Workflow::new(workflow, visit.into()))
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

#[cfg(test)]
mod tests {
    use super::WorkflowTemplatesQuery;
    use anyhow::Ok;
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};
    use axum_extra::headers::{authorization::Bearer, Authorization};
    use serde_json::json;

    #[tokio::test]
    async fn workflow_template_query() -> anyhow::Result<()> {
        let workflow_template_name = "numpy-benchmark";

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-template.json");
        let workflow_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/cluster-workflow-templates/{workflow_template_name}")[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = url::Url::parse(&server.url())?;
        let schema = Schema::build(WorkflowTemplatesQuery, EmptyMutation, EmptySubscription)
            .data(crate::ArgoServerUrl(argo_server_url))
            .data(
                None::<
                    axum_extra::headers::Authorization<axum_extra::headers::authorization::Bearer>,
                >,
            )
            .finish();
        let response = schema
            .execute(format!(
                "{{ workflowTemplate(name: \"{workflow_template_name}\") {{ name repository }} }}"
            ))
            .await;
        let response = response.into_result().expect("Invalid response");
        workflow_endpoint.assert_async().await;

        let actual = response.data.into_json().unwrap();
        let expected = serde_json::json!(
            { "workflowTemplate":
                {
                    "name": "numpy-benchmark",
                    "repository": "https://github.com/DiamondLightSource/workflows"
                }
            }
        );
        assert_eq!(expected, actual);
        Ok(())
    }

    #[tokio::test]
    async fn query_full_schema() -> anyhow::Result<()> {
        let workflow_template_name = "numpy-benchmark";

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-template-full-param-schema.json");
        let workflow_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/cluster-workflow-templates/{workflow_template_name}")[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = url::Url::parse(&server.url())?;
        let schema = Schema::build(WorkflowTemplatesQuery, EmptyMutation, EmptySubscription)
            .data(crate::ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let response = schema
            .execute(format!(
                "{{ workflowTemplate(name: \"{workflow_template_name}\") {{ name repository arguments }} }}"
            ))
            .await;
        let response = response.into_result().expect("Invalid response");
        workflow_endpoint.assert_async().await;

        let actual = response.data.into_json().unwrap();

        let arguments = json!({
            "$defs": {
                "Quiet": {
                    "title": "Quiet",
                    "type": "object",
                    "properties": {
                        "active": {
                            "default": true,
                            "description": "",
                            "title": "Quiet mode",
                            "type": "boolean"
                        }
                    }
                }
            },
            "description": "This is the description of the main model",
            "properties": {
                "experiment-type": {
                    "anyOf": [
                        { "type": "string" },
                        { "type": "null" }
                    ],
                    "default": null,
                    "description": "",
                    "title": "Experiment Type"
                },
                "quiet": {
                    "$ref": "#/$defs/Quiet"
                }
            },
            "required": ["quiet"],
            "title": "Main",
            "type": "object"
        });
        let expected = serde_json::json!(
            { "workflowTemplate":
                {
                    "name": "numpy-benchmark",
                    "repository": "https://github.com/DiamondLightSource/workflows",
                    "arguments": arguments
                }
            }
        );

        assert_eq!(expected, actual);
        Ok(())
    }

    #[tokio::test]
    async fn no_templates_response() {
        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-templates-null.json");

        let workflows_endpoint = server
            .mock("GET", "/api/v1/cluster-workflow-templates")
            .match_query(mockito::Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(&response_file_path)
            .create_async()
            .await;

        let argo_server_url = url::Url::parse(&server.url()).unwrap();
        let schema = Schema::build(WorkflowTemplatesQuery, EmptyMutation, EmptySubscription)
            .data(crate::ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();

        let query = r#"
            query {
                workflowTemplates(
                    filter: { scienceGroup: MX }
                ) {
                    nodes {
                        name
                    }
                }
            }
        "#;

        let expected = json!({
            "workflowTemplates": {
              "nodes": []
            }
        });

        let response = schema.execute(query).await.into_result().unwrap();
        workflows_endpoint.assert_async().await;
        assert_eq!(response.data.into_json().unwrap(), expected);
    }
}
