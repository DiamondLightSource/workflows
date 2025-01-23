use super::{Visit, VisitInput, CLIENT};
use crate::ArgoServerUrl;
use argo_workflows_openapi::{
    APIResult, IoArgoprojWorkflowV1alpha1NodeStatus, IoArgoprojWorkflowV1alpha1Workflow,
};
use async_graphql::{
    connection::{Connection, CursorType, Edge, EmptyFields, OpaqueCursor},
    Context, Enum, Object, SimpleObject, Union,
};
use axum_extra::headers::{authorization::Bearer, Authorization};
use chrono::{DateTime, Utc};
use std::{collections::HashMap, ops::Deref, sync::Arc};
use tracing::{debug, instrument};

/// An error encountered when parsing the Argo Server API Workflow response
#[derive(Debug, thiserror::Error)]
#[allow(clippy::missing_docs_in_private_items)]
pub(super) enum WorkflowParsingError {
    #[error("status.phase was not a recognised value")]
    UnrecognisedPhase,
    #[error("status.start_time was expected but was not present")]
    MissingStartTime,
    #[error("status.end_time was expected but was not present")]
    MissingEndTime,
    #[error("value.phase was not a recognised value")]
    UnrecognisedTaskPhase,
    #[error("value.display_name was not a recognised value")]
    UnrecognisedTaskDisplayName,
}

/// A Workflow consisting of one or more [`Task`]s
#[derive(Debug)]
pub(super) struct Workflow {
    /// Manifest associated with the workflow
    pub(super) manifest: Arc<IoArgoprojWorkflowV1alpha1Workflow>,
    /// Visit associated with the workflow
    pub(super) visit: Visit,
}

#[Object]
impl Workflow {
    /// The name given to the workflow, unique within a given visit
    async fn name(&self) -> &str {
        self.manifest.metadata.name.as_ref().unwrap()
    }

    /// The visit the Workflow was run against
    async fn visit(&self) -> &Visit {
        &self.visit
    }

    /// The current status of the workflow
    async fn status(&self) -> Result<Option<WorkflowStatus>, WorkflowParsingError> {
        WorkflowStatus::new(Arc::clone(&self.manifest))
    }
}

/// The status of a workflow
#[derive(Debug, Union)]
#[allow(clippy::missing_docs_in_private_items)]
enum WorkflowStatus {
    Pending(WorkflowPendingStatus),
    Running(WorkflowRunningStatus),
    Succeeded(WorkflowSucceededStatus),
    Failed(WorkflowFailedStatus),
    Errored(WorkflowErroredStatus),
}

impl WorkflowStatus {
    /// Creates a new [`WorkflowStatus`] from [`IoArgoprojWorkflowV1alpha1Workflow`]
    fn new(
        workflow: Arc<IoArgoprojWorkflowV1alpha1Workflow>,
    ) -> Result<Option<Self>, WorkflowParsingError> {
        let status = workflow.status.as_ref().unwrap();
        match status.phase.as_deref() {
            Some("Pending") => Ok(Some(Self::Pending(WorkflowPendingStatus(workflow)))),
            Some("Running") => Ok(Some(Self::Running(WorkflowRunningStatus(workflow)))),
            Some("Succeeded") => Ok(Some(Self::Succeeded(
                WorkflowCompleteStatus::new(workflow)?.into(),
            ))),
            Some("Failed") => Ok(Some(Self::Failed(
                WorkflowCompleteStatus::new(workflow)?.into(),
            ))),
            Some("Error") => Ok(Some(Self::Errored(
                WorkflowCompleteStatus::new(workflow)?.into(),
            ))),
            Some(_) => Err(WorkflowParsingError::UnrecognisedPhase),
            None => Ok(None),
        }
    }
}

/// No tasks within the workflow have been scheduled
#[derive(Debug)]
struct WorkflowPendingStatus(Arc<IoArgoprojWorkflowV1alpha1Workflow>);

#[Object]
impl WorkflowPendingStatus {
    /// A human readable message indicating details about why the workflow is in this condition
    async fn message(&self) -> Option<String> {
        self.0.status.as_ref().unwrap().message.clone()
    }
}

/// At least one of the tasks has been scheduled, but they have not yet all complete
#[derive(Debug)]
struct WorkflowRunningStatus(Arc<IoArgoprojWorkflowV1alpha1Workflow>);

#[Object]
impl WorkflowRunningStatus {
    /// Time at which this workflow started
    async fn start_time(&self) -> Result<DateTime<Utc>, WorkflowParsingError> {
        let status = self.0.status.as_ref().unwrap();
        Ok(**status
            .started_at
            .as_ref()
            .ok_or(WorkflowParsingError::MissingStartTime)?)
    }

    /// A human readable message indicating details about why the workflow is in this condition
    async fn message(&self) -> Option<String> {
        self.0.status.as_ref().unwrap().message.clone()
    }

    /// Tasks created by the workflow
    async fn tasks(&self) -> Result<Vec<Task>, WorkflowParsingError> {
        let nodes = self.0.status.as_ref().unwrap().nodes.clone();
        match TaskMap(nodes).into_tasks(Arc::clone(&self.0))? {
            Tasks::Fetched(tasks) => Ok(tasks),
            Tasks::UnFetched(_) => panic!("Unfetched tasks should be resolved"),
        }
    }
}

/// All tasks in the workflow have succeded
#[derive(Debug, SimpleObject, derive_more::From)]
struct WorkflowSucceededStatus {
    #[graphql(flatten)]
    #[allow(clippy::missing_docs_in_private_items)]
    status: WorkflowCompleteStatus,
}

/// All tasks in the workflow have failed
#[derive(Debug, SimpleObject, derive_more::From)]
struct WorkflowFailedStatus {
    #[graphql(flatten)]
    #[allow(clippy::missing_docs_in_private_items)]
    status: WorkflowCompleteStatus,
}

/// All tasks in the workflow have errored
#[derive(Debug, SimpleObject, derive_more::From)]
struct WorkflowErroredStatus {
    #[graphql(flatten)]
    #[allow(clippy::missing_docs_in_private_items)]
    status: WorkflowCompleteStatus,
}

/// All tasks in the workflow have completed (succeeded, failed, or errored)
#[derive(Debug, SimpleObject)]
struct WorkflowCompleteStatus {
    /// Time at which this workflow started
    start_time: DateTime<Utc>,
    /// Time at which this workflow completed
    end_time: DateTime<Utc>,
    /// A human readable message indicating details about why the workflow is in this condition
    message: Option<String>,
    /// Tasks created by the workflow
    #[graphql(flatten)]
    tasks: Tasks,
}

impl WorkflowCompleteStatus {
    /// Creates a new [`WorkflowCompleteStatus`] from [`IoArgoprojWorkflowV1alpha1Workflow`]
    fn new(value: Arc<IoArgoprojWorkflowV1alpha1Workflow>) -> Result<Self, WorkflowParsingError> {
        let status = value.status.as_ref().unwrap();
        Ok(Self {
            start_time: **status
                .started_at
                .as_ref()
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: **status
                .finished_at
                .as_ref()
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: status.message.clone(),
            tasks: TaskMap(status.nodes.clone()).into_tasks(value)?,
        })
    }
}

#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug, Enum, PartialEq, Eq, Clone, Copy)]
enum TaskStatus {
    Pending,
    Running,
    Succeeded,
    Skipped,
    Failed,
    Error,
    Omitted,
}

impl TryFrom<String> for TaskStatus {
    type Error = WorkflowParsingError;

    fn try_from(status: String) -> Result<Self, <Self as TryFrom<String>>::Error> {
        match status.as_str() {
            "Pending" => Ok(TaskStatus::Pending),
            "Running" => Ok(TaskStatus::Running),
            "Succeeded" => Ok(TaskStatus::Succeeded),
            "Skipped" => Ok(TaskStatus::Skipped),
            "Failed" => Ok(TaskStatus::Failed),
            "Error" => Ok(TaskStatus::Error),
            "Omitted" => Ok(TaskStatus::Omitted),
            _ => Err(WorkflowParsingError::UnrecognisedTaskPhase),
        }
    }
}

/// A Task created by a workflow
#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug, Clone)]
struct Task {
    node_status: IoArgoprojWorkflowV1alpha1NodeStatus,
    depends: Vec<String>,
}

#[Object]
impl Task {
    /// Unique name of the task
    async fn id(&self) -> &String {
        &self.node_status.id
    }

    /// Display name of the task
    async fn name(&self) -> Result<&String, WorkflowParsingError> {
        self.node_status
            .display_name
            .as_ref()
            .ok_or(WorkflowParsingError::UnrecognisedTaskDisplayName)
    }

    /// Current status of a task
    async fn status(&self) -> Result<TaskStatus, WorkflowParsingError> {
        TaskStatus::try_from(
            self.node_status
                .phase
                .as_ref()
                .ok_or(WorkflowParsingError::UnrecognisedTaskPhase)?
                .to_string(),
        )
    }

    /// Parent of a task
    async fn depends(&self) -> Vec<String> {
        self.depends.clone()
    }

    /// Children of a task
    async fn dependencies(&self) -> Vec<String> {
        self.node_status.children.clone()
    }
}

#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug)]
enum Tasks {
    Fetched(Vec<Task>),
    UnFetched(Arc<IoArgoprojWorkflowV1alpha1Workflow>),
}

#[Object]
impl Tasks {
    #[allow(clippy::missing_docs_in_private_items)]
    async fn tasks(&self, ctx: &Context<'_>) -> anyhow::Result<Vec<Task>> {
        match self {
            Tasks::Fetched(tasks) => Ok(tasks.clone()),
            Tasks::UnFetched(manifest) => {
                let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
                let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
                let mut url = server_url.clone();
                url.path_segments_mut().unwrap().extend([
                    "api",
                    "v1",
                    "workflows",
                    manifest.as_ref().metadata.namespace.as_ref().unwrap(),
                    manifest.as_ref().metadata.name.as_ref().unwrap(),
                ]);
                let request = if let Some(auth_token) = auth_token {
                    CLIENT.get(url).bearer_auth(auth_token.token())
                } else {
                    CLIENT.get(url)
                };
                let nodes = request
                    .send()
                    .await?
                    .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow>>()
                    .await?
                    .into_result()?
                    .status
                    .unwrap() //  Safe as the status field is always present
                    .nodes;
                Ok(match TaskMap(nodes).into_tasks(Arc::clone(manifest))? {
                    Tasks::Fetched(fetched_tasks) => fetched_tasks,
                    Tasks::UnFetched(_) => vec![],
                })
            }
        }
    }
}

/// A wrapper for list of tasks
struct TaskMap(HashMap<String, IoArgoprojWorkflowV1alpha1NodeStatus>);

impl TaskMap {
    /// Generates a relationship map between parent and children
    fn generate_relationship_map(&self) -> HashMap<String, Vec<String>> {
        let mut parent_map: HashMap<String, Vec<String>> = HashMap::new();

        for (node_name, node_status) in &self.0 {
            for child in &node_status.children {
                parent_map
                    .entry(child.clone())
                    .or_default()
                    .push(node_name.clone());
            }
        }
        parent_map
    }

    /// Converts [`TaskMap`] into [`Tasks`]`
    fn into_tasks(
        self,
        manifest: Arc<IoArgoprojWorkflowV1alpha1Workflow>,
    ) -> Result<Tasks, WorkflowParsingError> {
        let mut relationship_map = TaskMap::generate_relationship_map(&self);
        if self.0.is_empty() {
            return Ok(Tasks::UnFetched(manifest));
        }
        let tasks = self
            .0
            .into_iter()
            .map(|(node_name, node_status)| {
                let depends = relationship_map.remove(&node_name).unwrap_or_default();
                Task {
                    node_status,
                    depends,
                }
            })
            .collect::<Vec<_>>();
        Ok(Tasks::Fetched(tasks))
    }
}

/// Queries related to [`Workflow`]s
#[derive(Debug, Clone, Default)]
pub struct WorkflowsQuery;

#[Object]
impl WorkflowsQuery {
    /// Get a single [`Workflow`] by proposal, visit, and name
    #[instrument(skip(self, ctx))]
    async fn workflow(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        name: String,
    ) -> anyhow::Result<Workflow> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let mut url = server_url.clone();
        url.path_segments_mut().unwrap().extend([
            "api",
            "v1",
            "workflows",
            &visit.to_string(),
            &name,
        ]);
        debug!("Retrieving workflow from {url}");
        let request = if let Some(auth_token) = auth_token {
            CLIENT.get(url).bearer_auth(auth_token.token())
        } else {
            CLIENT.get(url)
        };
        let workflow = request
            .send()
            .await?
            .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow>>()
            .await?
            .into_result()?;
        Ok(Workflow {
            manifest: Arc::new(workflow),
            visit: visit.into(),
        })
    }

    #[instrument(skip(self, ctx))]
    async fn workflows(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        cursor: Option<String>,
        #[graphql(validator(minimum = 1, maximum = 10))] limit: Option<u32>,
    ) -> anyhow::Result<Connection<OpaqueCursor<usize>, Workflow, EmptyFields, EmptyFields>> {
        let mut url = ctx.data_unchecked::<ArgoServerUrl>().deref().to_owned();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "workflows", &visit.to_string()]);
        let limit = limit.unwrap_or(10);
        url.query_pairs_mut()
            .append_pair("listOptions.limit", &limit.to_string());
        let cursor_index = if let Some(cursor) = cursor {
            let cursor_value = OpaqueCursor::<usize>::decode_cursor(&cursor)
                .map_err(|_| anyhow::Error::msg("Cursor not valid"))?;
            url.query_pairs_mut()
                .append_pair("listOptions.continue", &cursor_value.0.to_string());
            cursor_value.0
        } else {
            0
        };
        debug!("Retrieving workflows name from {url}");
        let request = if let Some(auth_token) = auth_token {
            CLIENT.get(url).bearer_auth(auth_token.token())
        } else {
            CLIENT.get(url)
        };
        let workflows_response = request
            .send()
            .await?
            .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowList>>()
            .await?
            .into_result()?;
        let workflows = workflows_response
            .items
            .into_iter()
            .map(|workflow| Workflow {
                manifest: Arc::new(workflow),
                visit: visit.clone().into(),
            })
            .collect::<Vec<_>>();
        let mut connection = Connection::new(
            cursor_index > 0,
            workflows_response.metadata.continue_.is_some(),
        );
        connection
            .edges
            .extend(workflows.into_iter().enumerate().map(|(idx, workflow)| {
                let cursor = OpaqueCursor(cursor_index + idx + 1);
                Edge::new(cursor, workflow)
            }));
        Ok(connection)
    }
}

#[cfg(test)]
mod tests {
    use crate::graphql::{root_schema_builder, Authorization, Bearer, Visit};
    use crate::ArgoServerUrl;
    use serde_json::json;
    use std::path::PathBuf;
    use url::Url;

    #[tokio::test]
    async fn single_workflow_query() {
        let workflow_name = "numpy-benchmark-wdkwj";
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-wdkwj.json");
        let workflow_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/workflows/{}/{}", visit, workflow_name)[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflow(name: "{}", visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}) {{
                    name
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "name": workflow_name
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn single_succeeded_workflow_query() {
        let workflow_name = "numpy-benchmark-wdkwj";
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-wdkwj.json");
        let workflow_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/workflows/{}/{}", visit, workflow_name)[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflow(name: "{}", visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}) {{
                    status {{
                        ...on WorkflowSucceededStatus {{
                            startTime
                            endTime
                            message
                            tasks {{
                                id
                            }}
                        }}
                    }}
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "status": {
                    "startTime": "2024-11-19T09:45:46+00:00",
                    "endTime": "2024-11-19T09:46:59+00:00",
                    "message": null,
                    "tasks": [{"id": workflow_name}]
                }
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn single_failed_workflow_query() {
        let workflow_name = "numpy-benchmark-qhb59";
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-qhb59-failed.json");
        let workflow_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/workflows/{}/{}", visit, workflow_name)[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflow(name: "{}", visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}) {{
                    status {{
                        ...on WorkflowFailedStatus {{
                            startTime
                            endTime
                            message
                            tasks {{
                                id
                            }}
                        }}
                    }}
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "status": {
                    "startTime": "2024-10-02T11:11:17+00:00",
                    "endTime": "2024-10-02T11:12:32+00:00",
                    "message": "OOMKilled (exit code 137)",
                    "tasks": [{"id": workflow_name}]
                }
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn single_errored_workflow_query() {
        let workflow_name = "numpy-benchmark-jwcfp";
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-jwcfp-errored.json");
        let workflow_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/workflows/{}/{}", visit, workflow_name)[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflow(name: "{}", visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}) {{
                    status {{
                        ...on WorkflowErroredStatus {{
                            startTime
                            endTime
                            message
                            tasks {{
                                id
                            }}
                        }}
                    }}
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "status": {
                    "startTime": "2024-10-11T14:35:37+00:00",
                    "endTime": "2024-10-11T14:35:37+00:00",
                    "message": "error in entry template execution: Error applying PodSpecPatch",
                    "tasks": [{"id": workflow_name}]
                }
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn single_running_workflow_query() {
        let workflow_name = "numpy-benchmark-kc7pf";
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-kc7pf-running.json");
        let workflow_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/workflows/{}/{}", visit, workflow_name)[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflow(name: "{}", visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}) {{
                    status {{
                        ...on WorkflowRunningStatus {{
                            startTime
                            message
                            tasks {{
                                id
                            }}
                        }}
                    }}
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "status": {
                    "startTime": "2025-01-22T12:29:45+00:00",
                    "message": null,
                    "tasks": [{"id": workflow_name}]
                }
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn single_null_workflow_query() {
        let workflow_name = "numpy-benchmark-pwtgn";
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;
        let mut response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push("get-workflow-pwtgn-null.json");
        let workflow_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/workflows/{}/{}", visit, workflow_name)[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflow(name: "{}", visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}) {{
                    status {{
                        __typename
                    }}
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "status": null,
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn multiple_workflows_query() {
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };
        let limit = 2;

        let mut server = mockito::Server::new_async().await;
        let mut multiple_workflows_response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        multiple_workflows_response_file_path.push("test-assets");
        multiple_workflows_response_file_path.push("get-workflows.json");

        let workflows_endpoint = server
            .mock("GET", &format!("/api/v1/workflows/{}", visit)[..])
            .match_query(mockito::Matcher::AllOf(vec![mockito::Matcher::UrlEncoded(
                "listOptions.limit".to_string(),
                limit.to_string(),
            )]))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(multiple_workflows_response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflows(visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}, limit: {}) {{
                    nodes {{
                        name
                    }}
                    pageInfo {{
                        endCursor
                    }}
                }}
            }}
        "#,
            visit.proposal_code, visit.proposal_number, visit.number, limit
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflows_endpoint.assert_async().await;
        let expected_data = json!({
            "workflows": {
                "nodes": [
                    {
                        "name": "numpy-benchmark-wdkwj"
                    },
                    {
                        "name": "numpy-benchmark-n6jsg"
                    }
                ],
                "pageInfo": {"endCursor": "Mg"}
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn multiple_succeeded_workflows_task_ids_query() {
        let workflow_names = ["numpy-benchmark-wdkwj", "numpy-benchmark-n6jsg"];
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };
        let limit = 2;

        let mut server = mockito::Server::new_async().await;
        let mut multiple_workflows_response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        multiple_workflows_response_file_path.push("test-assets");
        multiple_workflows_response_file_path.push("get-workflows.json");
        let mut workflow_one_response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        workflow_one_response_file_path.push("test-assets");
        workflow_one_response_file_path.push("get-workflow-wdkwj.json");
        let mut workflow_two_response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        workflow_two_response_file_path.push("test-assets");
        workflow_two_response_file_path.push("get-workflow-n6jsg.json");

        let workflows_endpoint = server
            .mock("GET", &format!("/api/v1/workflows/{}", visit)[..])
            .match_query(mockito::Matcher::AllOf(vec![mockito::Matcher::UrlEncoded(
                "listOptions.limit".to_string(),
                limit.to_string(),
            )]))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(multiple_workflows_response_file_path)
            .create_async()
            .await;

        let workflow_one_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/workflows/{}/{}", visit, workflow_names[0])[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(workflow_one_response_file_path)
            .create_async()
            .await;

        let workflow_two_endpoint = server
            .mock(
                "GET",
                &format!("/api/v1/workflows/{}/{}", visit, workflow_names[1])[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(workflow_two_response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflows(visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}, limit: {}){{
                    nodes {{
                        status {{
                            ...on WorkflowSucceededStatus {{
                                tasks {{
                                    id
                                }}
                            }}
                        }}
                    }}
                }}
            }}
        "#,
            visit.proposal_code, visit.proposal_number, visit.number, limit
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflows_endpoint.assert_async().await;
        workflow_one_endpoint.assert_async().await;
        workflow_two_endpoint.assert_async().await;

        let nodes = workflow_names
            .iter()
            .map(|name| {
                json!({
                    "status": {
                        "tasks": [{"id": name}],
                    }
                })
            })
            .collect::<Vec<_>>();
        let expected_data = json!({
            "workflows": {
                "nodes": nodes,
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn multiple_workflows_query_default_limit() {
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };
        let expected_default_limit = 10;

        let mut server = mockito::Server::new_async().await;
        let mut multiple_workflows_response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        multiple_workflows_response_file_path.push("test-assets");
        multiple_workflows_response_file_path.push("get-workflows.json");

        let workflows_endpoint = server
            .mock("GET", &format!("/api/v1/workflows/{}", visit)[..])
            .match_query(mockito::Matcher::AllOf(vec![mockito::Matcher::UrlEncoded(
                "listOptions.limit".to_string(),
                expected_default_limit.to_string(),
            )]))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(multiple_workflows_response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .finish();
        let query = format!(
            r#"
            query {{
                workflows(visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}) {{
                    nodes {{
                        name
                    }}
                }}
            }}
        "#,
            visit.proposal_code, visit.proposal_number, visit.number
        );
        schema.execute(query).await.into_result().unwrap();
        workflows_endpoint.assert_async().await;
    }
}
