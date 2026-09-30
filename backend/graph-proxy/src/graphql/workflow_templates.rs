use super::{
    parameter_schema::{ArgumentSchema, ParameterSchemaError, Schema},
    ui_schema::{UiSchema, UiSchemaError},
    workflows::Workflow,
    VisitInput, CLIENT,
};
use crate::{graphql::auth_guard::AuthGuard, validate_token::ValidatedAuthToken};
use crate::{graphql::filters::WorkflowTemplatesFilter, ArgoServerUrl, SessionSpacesApiUrl};
use anyhow::anyhow;
use argo_workflows_openapi::APIResult;
use async_graphql::{
    connection::{Connection, CursorType, Edge, EmptyFields, OpaqueCursor},
    Context, Json, Object, SimpleObject,
};
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

#[Object(guard = "AuthGuard")]
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

#[Object(guard = "AuthGuard")]
impl WorkflowTemplatesQuery {
    /// Retrieves a single cluster workflow template by name
    #[instrument(name = "graph_proxy_workflow_template", skip(self, ctx))]
    async fn workflow_template(
        &self,
        ctx: &Context<'_>,
        name: String,
    ) -> anyhow::Result<WorkflowTemplate> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<ValidatedAuthToken>().as_token();
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

    /// Retrieves all cluster workflow templates with respective pagination data
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
        let auth_token = ctx.data_unchecked::<ValidatedAuthToken>().as_token();
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
            Err(err) => {
                if err.message.as_deref() == Some("Unauthorized") {
                    return Err(err.into());
                }
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

#[Object(guard = "AuthGuard")]
impl WorkflowTemplatesMutation {
    /// submit specific workflow template
    #[instrument(name = "graph_proxy_submit_workflow_template", skip(self, ctx))]
    async fn submit_workflow_template(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: VisitInput,
        parameters: Json<HashMap<String, Value>>,
    ) -> anyhow::Result<Workflow> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<ValidatedAuthToken>().as_token();
        let namespace = prepare_namespace(ctx, &visit).await?;
        let mut url = server_url.clone();
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

    /// Submit a manifest (YAML) as a one-off Workflow within a visit's namespace.
    ///
    /// The input is typically a `WorkflowTemplate` (the manifest developers author and
    /// store in their repository). It is submitted via the Argo Server API so the graph
    /// remains the single source of truth for submissions. To match the behaviour of the
    /// workflows CLI, the manifest is coerced into a one-off Workflow: `kind` is set to
    /// `Workflow`, and a fixed `metadata.name` is rewritten to a `metadata.generateName`
    /// (suffixed with `-`) so repeated submissions yield fresh, uniquely named Workflows.
    #[instrument(name = "graph_proxy_submit_workflow", skip(self, ctx, manifest))]
    async fn submit_workflow(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        manifest: String,
    ) -> anyhow::Result<Workflow> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<ValidatedAuthToken>().as_token();

        let mut workflow: argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow =
            serde_yaml::from_str(&manifest)
                .map_err(|err| anyhow!("Could not parse workflow manifest: {err}"))?;

        // Match the CLI: submit templates as one-off Workflows. Force the kind, and turn
        // a fixed `name` into a `generateName` so resubmission yields a fresh Workflow.
        workflow.kind = Some("Workflow".to_string());
        if let Some(name) = workflow.metadata.name.take() {
            workflow.metadata.generate_name = Some(format!("{name}-"));
        }

        let namespace = prepare_namespace(ctx, &visit).await?;
        let mut url = server_url.clone();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "workflows", &namespace]);
        debug!("Submitting workflow manifest at {url}");

        let request = if let Some(auth_token) = auth_token {
            CLIENT.post(url).bearer_auth(auth_token.token())
        } else {
            CLIENT.post(url)
        }
        .json(
            &argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowCreateRequest {
                namespace: Some(namespace.clone()),
                workflow: Some(workflow),
                ..Default::default()
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

/// Test namespaces exempt from SessionSpace preparation.
const PREPARATION_EXEMPT_NAMESPACES: &[&str] = &[
    "ks10000-1",
    "ks10000-2",
    "ks10000-3",
    "ks10000-4",
    "ks10000-5",
];

/// Prepare the visit's session namespace, returning the normalised name to submit to.
async fn prepare_namespace(ctx: &Context<'_>, visit: &VisitInput) -> anyhow::Result<String> {
    let namespace = visit.to_string().to_ascii_lowercase();
    if PREPARATION_EXEMPT_NAMESPACES.contains(&namespace.as_str()) {
        debug!(
            namespace,
            "Skipping SessionSpace preparation for exempt namespace"
        );
        return Ok(namespace);
    }
    let api_url = ctx.data::<SessionSpacesApiUrl>().map_err(|_| {
        tracing::warn!("SessionSpaces API URL not configured");
        anyhow!("Workflow submission is temporarily unavailable; please try again shortly")
    })?;
    let token = ctx.data_unchecked::<ValidatedAuthToken>().as_token();
    crate::sessionspaces::prepare_session(api_url, &namespace, token.map(|token| token.token()))
        .await?;
    Ok(namespace)
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
    use crate::{graphql::auth_guard::AuthErrorCode, validate_token::ValidatedAuthToken};

    use super::WorkflowTemplatesQuery;
    use anyhow::Ok;
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};
    use axum_extra::headers::Authorization;
    use rstest::rstest;
    use serde_json::json;

    fn test_token() -> ValidatedAuthToken {
        let token = Authorization::bearer("test-token").expect("token always valid");
        ValidatedAuthToken::Valid(token)
    }

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
            .data(test_token())
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
            .data(test_token())
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
            .data(test_token())
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

    #[tokio::test]
    #[rstest]
    #[case(ValidatedAuthToken::Missing)]
    #[case(ValidatedAuthToken::Invalid)]
    #[case(ValidatedAuthToken::Failed("reason".to_string()))]
    async fn unauthenticated_query_returns_null(
        #[case] auth_token: ValidatedAuthToken,
    ) -> anyhow::Result<()> {
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
            .expect(0)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = url::Url::parse(&server.url())?;
        let schema = Schema::build(WorkflowTemplatesQuery, EmptyMutation, EmptySubscription)
            .data(crate::ArgoServerUrl(argo_server_url))
            .data(auth_token)
            .finish();
        let response = schema
            .execute(format!(
                "{{ workflowTemplate(name: \"{workflow_template_name}\") {{ name repository }} }}"
            ))
            .await;
        workflow_endpoint.assert_async().await;

        let expected_data = json!(null);
        assert_eq!(
            response.data.into_json().expect("invalid response json"),
            expected_data
        );
        let error_code = response.errors[0]
            .extensions
            .as_ref()
            .expect("missing extensions")
            .get("code")
            .expect("missing code")
            .clone()
            .into_json()
            .expect("invalid json");
        let expected_value = json!(AuthErrorCode::Unauthenticated.to_string());
        assert_eq!(error_code, expected_value);
        Ok(())
    }

    #[tokio::test]
    async fn submit_workflow_mutation() -> anyhow::Result<()> {
        use super::WorkflowTemplatesMutation;
        use async_graphql::{Request, Variables};
        use mockito::Matcher;

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("submit-workflow.json");

        // The input is a WorkflowTemplate manifest; assert it is coerced into a one-off
        // Workflow (kind overridden, `name` -> `generateName`) and that the request lands
        // on the visit's namespaced workflow-create endpoint. The uppercase visit code is
        // normalised to the lowercase session namespace shared by preparation and Argo.
        let prepare_endpoint = server
            .mock("POST", "/prepare")
            .match_header("authorization", "Bearer test-token")
            .match_body(Matcher::PartialJson(json!({ "namespace": "mg36964-1" })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                json!({ "namespace": "mg36964-1", "generation": 1, "prepared": true }).to_string(),
            )
            .create_async()
            .await;
        let submit_endpoint = server
            .mock("POST", "/api/v1/workflows/mg36964-1")
            .match_body(Matcher::PartialJson(json!({
                "namespace": "mg36964-1",
                "workflow": {
                    "kind": "Workflow",
                    "metadata": {
                        "generateName": "test-workflow-"
                    }
                }
            })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let manifest = concat!(
            "apiVersion: argoproj.io/v1alpha1\n",
            "kind: WorkflowTemplate\n",
            "metadata:\n",
            "  name: test-workflow\n",
            "spec:\n",
            "  entrypoint: main\n",
        );

        let argo_server_url = url::Url::parse(&server.url())?;
        let sessionspaces_api_url = url::Url::parse(&server.url())?;
        let schema = Schema::build(
            WorkflowTemplatesQuery,
            WorkflowTemplatesMutation,
            EmptySubscription,
        )
        .data(crate::ArgoServerUrl(argo_server_url))
        .data(crate::SessionSpacesApiUrl(sessionspaces_api_url))
        .data(test_token())
        .finish();

        let query = r#"
            mutation ($manifest: String!) {
                submitWorkflow(
                    visit: { proposalCode: "MG", proposalNumber: 36964, number: 1 },
                    manifest: $manifest
                ) {
                    name
                }
            }
        "#;
        let request =
            Request::new(query).variables(Variables::from_json(json!({ "manifest": manifest })));
        let response = schema.execute(request).await;

        println!("Errors: {:#?}", response.errors);
        prepare_endpoint.assert_async().await;
        submit_endpoint.assert_async().await;
        let response = response.into_result().expect("Invalid response");

        let actual = response.data.into_json().unwrap();
        let expected = json!({
            "submitWorkflow": {
                "name": "test-workflow-abcde"
            }
        });
        assert_eq!(expected, actual);
        Ok(())
    }

    #[tokio::test]
    #[rstest]
    async fn submission_does_not_submit_when_prepare_fails(
        #[values(false, true)] template: bool,
        #[values(400, 401, 403, 502, 504)] status: usize,
    ) -> anyhow::Result<()> {
        use super::WorkflowTemplatesMutation;
        use async_graphql::{Request, Variables};
        use mockito::Matcher;

        let mut server = mockito::Server::new_async().await;

        let prepare_endpoint = server
            .mock("POST", "/prepare")
            .match_body(Matcher::PartialJson(json!({ "namespace": "mg36964-1" })))
            .match_header("authorization", "Bearer test-token")
            .with_status(status)
            .with_header("content-type", "application/json")
            .with_body(json!({ "error": "Session access denied" }).to_string())
            .create_async()
            .await;
        let submit_endpoint = server
            .mock(
                "POST",
                if template {
                    "/api/v1/workflows/mg36964-1/submit"
                } else {
                    "/api/v1/workflows/mg36964-1"
                },
            )
            .expect(0)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body("{}")
            .create_async()
            .await;

        let manifest = concat!(
            "apiVersion: argoproj.io/v1alpha1\n",
            "kind: WorkflowTemplate\n",
            "metadata:\n",
            "  name: test-workflow\n",
            "spec:\n",
            "  entrypoint: main\n",
        );

        let sessionspaces_api_url = url::Url::parse(&server.url())?;
        let schema = Schema::build(
            WorkflowTemplatesQuery,
            WorkflowTemplatesMutation,
            EmptySubscription,
        )
        .data(crate::ArgoServerUrl(url::Url::parse(&server.url())?))
        .data(crate::SessionSpacesApiUrl(sessionspaces_api_url))
        .data(test_token())
        .finish();

        let query = r#"
            mutation ($manifest: String!) {
                submitWorkflow(
                    visit: { proposalCode: "mg", proposalNumber: 36964, number: 1 },
                    manifest: $manifest
                ) {
                    name
                }
            }
        "#;
        let request = if template {
            Request::new(
                r#"mutation {
                submitWorkflowTemplate(
                    name: "test-workflow",
                    visit: { proposalCode: "mg", proposalNumber: 36964, number: 1 },
                    parameters: {}
                ) { name }
            }"#,
            )
        } else {
            Request::new(query).variables(Variables::from_json(json!({ "manifest": manifest })))
        };
        let response = schema.execute(request).await;

        prepare_endpoint.assert_async().await;
        submit_endpoint.assert_async().await;
        assert_eq!(response.data.into_json().unwrap(), json!(null));
        assert_eq!(response.errors.len(), 1);
        let message = &response.errors[0].message;
        let expected = if matches!(status, 401 | 403) {
            "Not authorized for session mg36964-1"
        } else {
            "Could not submit workflow for session mg36964-1; please try again shortly"
        };
        assert_eq!(message, expected);
        Ok(())
    }

    #[tokio::test]
    #[rstest]
    async fn submission_skips_prepare_for_exempt_namespaces(
        #[values(false, true)] template: bool,
    ) -> anyhow::Result<()> {
        use super::WorkflowTemplatesMutation;
        use async_graphql::{Request, Variables};
        use mockito::Matcher;

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("submit-workflow.json");

        let prepare_endpoint = server
            .mock("POST", "/prepare")
            .expect(0)
            .create_async()
            .await;
        let submit_endpoint = server
            .mock(
                "POST",
                if template {
                    "/api/v1/workflows/ks10000-3/submit"
                } else {
                    "/api/v1/workflows/ks10000-3"
                },
            )
            .match_body(Matcher::PartialJson(json!({ "namespace": "ks10000-3" })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let manifest = concat!(
            "apiVersion: argoproj.io/v1alpha1\n",
            "kind: WorkflowTemplate\n",
            "metadata:\n",
            "  name: test-workflow\n",
            "spec:\n",
            "  entrypoint: main\n",
        );

        let schema = Schema::build(
            WorkflowTemplatesQuery,
            WorkflowTemplatesMutation,
            EmptySubscription,
        )
        .data(crate::ArgoServerUrl(url::Url::parse(&server.url())?))
        .data(test_token())
        .finish();

        let request = if template {
            Request::new(
                r#"mutation {
                submitWorkflowTemplate(
                    name: "test-workflow",
                    visit: { proposalCode: "KS", proposalNumber: 10000, number: 3 },
                    parameters: {}
                ) { name }
            }"#,
            )
        } else {
            Request::new(
                r#"mutation ($manifest: String!) {
                submitWorkflow(
                    visit: { proposalCode: "KS", proposalNumber: 10000, number: 3 },
                    manifest: $manifest
                ) { name }
            }"#,
            )
            .variables(Variables::from_json(json!({ "manifest": manifest })))
        };
        let response = schema.execute(request).await;

        println!("Errors: {:#?}", response.errors);
        prepare_endpoint.assert_async().await;
        submit_endpoint.assert_async().await;
        let response = response.into_result().expect("Invalid response");

        let actual = response.data.into_json().unwrap();
        if template {
            assert_eq!(
                actual,
                json!({ "submitWorkflowTemplate": { "name": "test-workflow-abcde" } })
            );
        } else {
            assert_eq!(
                actual,
                json!({ "submitWorkflow": { "name": "test-workflow-abcde" } })
            );
        }
        Ok(())
    }
}
