use super::{Visit, VisitInput, CLIENT};
use crate::ArgoServerUrl;
use argo_workflows_openapi::{
    APIResult, IoArgoprojWorkflowV1alpha1Artifact, IoArgoprojWorkflowV1alpha1NodeStatus,
    IoArgoprojWorkflowV1alpha1Workflow, IoArgoprojWorkflowV1alpha1WorkflowStatus,
};
use async_graphql::{
    connection::{Connection, CursorType, Edge, EmptyFields, OpaqueCursor},
    Context, Enum, InputObject, Object, SimpleObject, Union,
};
use axum_extra::headers::{authorization::Bearer, Authorization};
use chrono::{DateTime, Utc};
use std::{collections::HashMap, ops::Deref, path::Path};
use tracing::{debug, instrument};
use url::Url;

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
    #[error("status was expected but was not present")]
    MissingWorkflowStatus,
    #[error("artifact.s3 was expected but was not present")]
    UnrecognisedArtifactStore,
    #[error("artifact.s3.key was expected but was not present")]
    MissingArtifactKey,
    #[error("artifact file name is not valid UTF-8")]
    InvalidArtifactFilename,
}

/// A Workflow consisting of one or more [`Task`]s
#[derive(Debug)]
pub(super) struct Workflow {
    /// Manifest associated with the workflow
    pub(super) manifest: IoArgoprojWorkflowV1alpha1Workflow,
    /// Metadata associated with the workflow
    pub(super) metadata: Metadata,
}

impl Workflow {
    /// Create [`Workflow`] from [`IoArgoprojWorkflowV1alpha1Workflow`] and [`Visit`]
    pub fn new(manifest: IoArgoprojWorkflowV1alpha1Workflow, visit: Visit) -> Workflow {
        let name = manifest.metadata.name.clone().unwrap();
        Workflow {
            manifest,
            metadata: Metadata { name, visit },
        }
    }
}

#[Object]
impl Workflow {
    /// The name given to the workflow, unique within a given visit
    async fn name(&self) -> &str {
        &self.metadata.name
    }

    /// The visit the Workflow was run against
    async fn visit(&self) -> &Visit {
        &self.metadata.visit
    }

    /// The current status of the workflow
    async fn status(&self) -> Result<Option<WorkflowStatus>, WorkflowParsingError> {
        WorkflowStatus::new(&self.manifest, &self.metadata)
    }

    /// The name of the template used to run the workflow
    async fn workflow_template_ref(&self) -> Option<&str> {
        self.manifest
            .spec
            .workflow_template_ref
            .as_ref()
            .and_then(|template_ref| template_ref.name.as_deref())
    }
}

#[derive(Debug)]
pub(super) struct Metadata {
    /// The name given to the workflow, unique within a given visit
    name: String,
    /// The visit the Workflow was run against
    visit: Visit,
}

/// The status of a workflow
#[derive(Debug, Union)]
#[allow(clippy::missing_docs_in_private_items)]
enum WorkflowStatus<'a> {
    Pending(WorkflowPendingStatus<'a>),
    Running(WorkflowRunningStatus<'a>),
    Succeeded(WorkflowSucceededStatus<'a>),
    Failed(WorkflowFailedStatus<'a>),
    Errored(WorkflowErroredStatus<'a>),
}

impl<'a> WorkflowStatus<'a> {
    /// Creates a new `WorkflowStatus` from `IoArgoprojWorkflowV1alpha1WorkflowStatus` and associated metadata.
    fn new(
        workflow: &'a IoArgoprojWorkflowV1alpha1Workflow,
        metadata: &'a Metadata,
    ) -> Result<Option<Self>, WorkflowParsingError> {
        match workflow.status.as_ref() {
            Some(status) => match status.phase.as_deref() {
                Some("Pending") => Ok(Some(Self::Pending(WorkflowPendingStatus(status)))),
                Some("Running") => Ok(Some(Self::Running(WorkflowRunningStatus {
                    manifest: status,
                    metadata,
                }))),
                Some("Succeeded") => Ok(Some(Self::Succeeded(
                    WorkflowCompleteStatus {
                        manifest: status,
                        metadata,
                    }
                    .into(),
                ))),
                Some("Failed") => Ok(Some(Self::Failed(
                    WorkflowCompleteStatus {
                        manifest: status,
                        metadata,
                    }
                    .into(),
                ))),
                Some("Error") => Ok(Some(Self::Errored(
                    WorkflowCompleteStatus {
                        manifest: status,
                        metadata,
                    }
                    .into(),
                ))),
                Some(_) => Err(WorkflowParsingError::UnrecognisedPhase),
                None => Ok(None),
            },
            None => Err(WorkflowParsingError::MissingWorkflowStatus),
        }
    }
}

/// No tasks within the workflow have been scheduled
#[derive(Debug)]
struct WorkflowPendingStatus<'a>(&'a IoArgoprojWorkflowV1alpha1WorkflowStatus);

#[Object]
impl WorkflowPendingStatus<'_> {
    /// A human readable message indicating details about why the workflow is in this condition
    async fn message(&self) -> Option<&str> {
        self.0.message.as_deref()
    }
}

/// At least one of the tasks has been scheduled, but they have not yet all complete
#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug)]
struct WorkflowRunningStatus<'a> {
    manifest: &'a IoArgoprojWorkflowV1alpha1WorkflowStatus,
    metadata: &'a Metadata,
}

#[Object]
impl WorkflowRunningStatus<'_> {
    /// Time at which this workflow started
    async fn start_time(&self) -> Result<DateTime<Utc>, WorkflowParsingError> {
        Ok(**self
            .manifest
            .started_at
            .as_ref()
            .ok_or(WorkflowParsingError::MissingStartTime)?)
    }

    /// A human readable message indicating details about why the workflow is in this condition
    async fn message(&self) -> Option<&str> {
        self.manifest.message.as_deref()
    }

    /// Tasks created by the workflow
    async fn tasks(&self, ctx: &Context<'_>) -> anyhow::Result<Vec<Task>> {
        let url = ctx.data_unchecked::<ArgoServerUrl>().deref().to_owned();
        let token = ctx
            .data_unchecked::<Option<Authorization<Bearer>>>()
            .to_owned();
        let nodes = fetch_missing_task_info(url, token, self.manifest, self.metadata).await?;
        Ok(TaskMap(nodes).into_tasks(self.metadata))
    }
}

/// All tasks in the workflow have succeded
#[derive(Debug, SimpleObject, derive_more::From)]
struct WorkflowSucceededStatus<'a> {
    #[graphql(flatten)]
    #[allow(clippy::missing_docs_in_private_items)]
    status: WorkflowCompleteStatus<'a>,
}

/// All tasks in the workflow have failed
#[derive(Debug, SimpleObject, derive_more::From)]
struct WorkflowFailedStatus<'a> {
    #[graphql(flatten)]
    #[allow(clippy::missing_docs_in_private_items)]
    status: WorkflowCompleteStatus<'a>,
}

/// All tasks in the workflow have errored
#[derive(Debug, SimpleObject, derive_more::From)]
struct WorkflowErroredStatus<'a> {
    #[graphql(flatten)]
    #[allow(clippy::missing_docs_in_private_items)]
    status: WorkflowCompleteStatus<'a>,
}

/// All tasks in the workflow have completed (succeeded, failed, or errored)
#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug)]
struct WorkflowCompleteStatus<'a> {
    manifest: &'a IoArgoprojWorkflowV1alpha1WorkflowStatus,
    metadata: &'a Metadata,
}

#[Object]
impl WorkflowCompleteStatus<'_> {
    /// Time at which this workflow started
    async fn start_time(&self) -> Result<DateTime<Utc>, WorkflowParsingError> {
        Ok(**self
            .manifest
            .started_at
            .as_ref()
            .ok_or(WorkflowParsingError::MissingStartTime)?)
    }

    /// Time at which this workflow completed
    async fn end_time(&self) -> Result<DateTime<Utc>, WorkflowParsingError> {
        Ok(**self
            .manifest
            .finished_at
            .as_ref()
            .ok_or(WorkflowParsingError::MissingEndTime)?)
    }

    /// A human readable message indicating details about why the workflow is in this condition
    async fn message(&self) -> Option<&str> {
        self.manifest.message.as_deref()
    }

    /// Tasks created by the workflow
    async fn tasks(&self, ctx: &Context<'_>) -> anyhow::Result<Vec<Task>> {
        let url = ctx.data_unchecked::<ArgoServerUrl>().deref().to_owned();
        let token = ctx
            .data_unchecked::<Option<Authorization<Bearer>>>()
            .to_owned();
        let nodes = fetch_missing_task_info(url, token, self.manifest, self.metadata).await?;
        Ok(TaskMap(nodes).into_tasks(self.metadata))
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

/// An output produced by a [`Task`] within a [`Workflow`]
#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug)]
struct Artifact<'a> {
    manifest: &'a IoArgoprojWorkflowV1alpha1Artifact,
    metadata: &'a Metadata,
    node_id: &'a str,
}

#[Object]
impl Artifact<'_> {
    /// The file name of the artifact
    async fn name(&self) -> Result<&str, WorkflowParsingError> {
        artifact_filename(self.manifest)
    }

    /// The download URL for the artifact
    async fn url(&self, ctx: &Context<'_>) -> Url {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let mut url = server_url.clone();
        url.path_segments_mut().unwrap().extend([
            "artifacts",
            &self.metadata.visit.to_string(),
            &self.metadata.name,
            self.node_id,
            &self.manifest.name,
        ]);
        url
    }

    /// The MIME type of the artifact data
    async fn mime_type(&self) -> Result<&str, WorkflowParsingError> {
        let filename = artifact_filename(self.manifest)?;
        Ok(mime_guess::from_path(filename)
            .first_raw()
            .unwrap_or("application/octet-stream"))
    }
}

fn artifact_filename(
    manifest: &IoArgoprojWorkflowV1alpha1Artifact,
) -> Result<&str, WorkflowParsingError> {
    let path = Path::new(
        manifest
            .s3
            .as_ref()
            .ok_or(WorkflowParsingError::UnrecognisedArtifactStore)?
            .key
            .as_ref()
            .ok_or(WorkflowParsingError::MissingArtifactKey)?,
    );
    path.file_name()
        .unwrap_or_default()
        .to_str()
        .ok_or(WorkflowParsingError::InvalidArtifactFilename)
}

/// A Task created by a workflow
#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug, Clone)]
struct Task<'a> {
    node_status: IoArgoprojWorkflowV1alpha1NodeStatus,
    depends: Vec<String>,
    metadata: &'a Metadata,
}

#[Object]
impl Task<'_> {
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

    /// Artifacts produced by a task
    async fn artifacts(&self) -> Vec<Artifact> {
        self.node_status
            .outputs
            .as_ref()
            .map(|outputs| {
                outputs
                    .artifacts
                    .iter()
                    .map(|manifest| Artifact {
                        manifest,
                        metadata: self.metadata,
                        node_id: &self.node_status.id,
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default()
    }
}

async fn fetch_missing_task_info(
    mut url: Url,
    token: Option<Authorization<Bearer>>,
    manifest: &IoArgoprojWorkflowV1alpha1WorkflowStatus,
    metadata: &Metadata,
) -> anyhow::Result<HashMap<String, IoArgoprojWorkflowV1alpha1NodeStatus>> {
    let mut nodes = manifest.nodes.clone();
    if nodes.is_empty() {
        url.path_segments_mut().unwrap().extend([
            "api",
            "v1",
            "workflows",
            &metadata.visit.to_string(),
            &metadata.name,
        ]);
        let request = if let Some(token) = token {
            CLIENT.get(url).bearer_auth(token.token())
        } else {
            CLIENT.get(url)
        };
        nodes = request
            .send()
            .await?
            .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow>>()
            .await?
            .into_result()?
            .status
            .unwrap() //  Safe as the status field is always present
            .nodes;
    }
    Ok(nodes)
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

    /// Converts [`TaskMap`] into [`Vec<Task>`]`
    fn into_tasks(self, metadata: &Metadata) -> Vec<Task> {
        let mut relationship_map = TaskMap::generate_relationship_map(&self);
        self.0
            .into_iter()
            .map(|(node_name, node_status)| {
                let depends = relationship_map.remove(&node_name).unwrap_or_default();
                Task {
                    node_status,
                    depends,
                    metadata,
                }
            })
            .collect::<Vec<_>>()
    }
}

/// All the supported Workflows filters
#[derive(Debug, Default, Clone, InputObject)]
struct WorkflowFilter {
    /// The status field for a workflow
    workflow_status_filter: Option<WorkflowStatusFilter>,
}

impl WorkflowFilter {
    /// Generates and applies all the filters
    fn generate_filters(&self, url: &mut Url) {
        let labels = &self.create_label_selection();
        url.query_pairs_mut()
            .append_pair("listOptions.labelSelector", labels);
    }

    /// Creates a string of all the reqested filters that belong to the
    /// `labelSelector` query key in the Workflow API
    fn create_label_selection(&self) -> String {
        let mut label_selectors = Vec::new();

        if let Some(status_filter) = &self.workflow_status_filter {
            if status_filter.is_enabled() {
                let status_label = format!(
                    "workflows.argoproj.io/phase in ({})",
                    status_filter.to_phases().join(", ")
                );
                label_selectors.push(status_label);
            }
        }

        label_selectors.join(",")
    }
}

/// Represents workflow status filters
#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug, Default, Clone, InputObject)]
struct WorkflowStatusFilter {
    #[graphql(default = false)]
    pending: bool,
    #[graphql(default = false)]
    running: bool,
    #[graphql(default = false)]
    succeeded: bool,
    #[graphql(default = false)]
    failed: bool,
    #[graphql(default = false)]
    error: bool,
}

#[allow(clippy::missing_docs_in_private_items)]
impl WorkflowStatusFilter {
    pub fn is_enabled(&self) -> bool {
        self.pending || self.running || self.succeeded || self.failed || self.error
    }

    fn to_phases(&self) -> Vec<&'static str> {
        let mut phases = Vec::new();
        if self.pending {
            phases.push("Pending");
        }
        if self.running {
            phases.push("Running");
        }
        if self.succeeded {
            phases.push("Succeeded");
        }
        if self.failed {
            phases.push("Failed");
        }
        if self.error {
            phases.push("Error");
        }
        phases
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
        Ok(Workflow::new(workflow, visit.into()))
    }

    #[instrument(skip(self, ctx))]
    async fn workflows(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        cursor: Option<String>,
        #[graphql(validator(minimum = 1, maximum = 10))] limit: Option<u32>,
        filter: Option<WorkflowFilter>,
    ) -> anyhow::Result<Connection<OpaqueCursor<usize>, Workflow, EmptyFields, EmptyFields>> {
        let mut url = ctx.data_unchecked::<ArgoServerUrl>().deref().to_owned();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "workflows", &visit.to_string()]);

        if let Some(filter) = &filter {
            filter.generate_filters(&mut url);
        }
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
            .map(|workflow| Workflow::new(workflow, visit.clone().into()))
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

    #[tokio::test]
    async fn get_artifacts_of_succeeded_workflow_query() {
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
                            tasks {{
                                artifacts {{
                                    name
                                    url
                                }}
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
        let expected_download_url = format!(
            "{}/artifacts/{}/{}/{}/main-logs",
            server.url(),
            visit,
            workflow_name,
            workflow_name
        );
        let expected_data = json!({
            "workflow": {
                "status": {
                    "tasks": [{
                        "artifacts": [{
                            "name": "main.log",
                            "url": expected_download_url
                        }]
                    }]
                }
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn get_artifacts_mime_type_query() {
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
                            tasks {{
                                artifacts {{
                                    name
                                    mimeType
                                }}
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
                    "tasks": [{
                        "artifacts": [{
                            "name": "main.log",
                            "mimeType": "text/plain"
                        }]
                    }]
                }
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn workflow_template_ref() {
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
                    workflowTemplateRef
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "workflowTemplateRef": "numpy-benchmark"
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }
    #[tokio::test]
    async fn multiple_workflows_query_with_filter() {
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;
        let mut workflows_response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        workflows_response_file_path.push("test-assets");
        workflows_response_file_path.push("get-workflows.json");

        let workflows_endpoint = server
            .mock("GET", &format!("/api/v1/workflows/{}", visit)[..])
            .match_query(mockito::Matcher::AllOf(vec![mockito::Matcher::UrlEncoded(
                "listOptions.labelSelector".to_string(),
                "workflows.argoproj.io/phase in (Error)".to_string(),
            )]))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(&workflows_response_file_path)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url.clone()))
            .data(None::<Authorization<Bearer>>)
            .finish();

        let query = format!(
            r#"
            query {{
                workflows(
                    visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}, 
                    filter: {{ error: true }}
                ) {{
                    nodes {{
                        name
                    }}
                }}
            }}
        "#,
            visit.proposal_code, visit.proposal_number, visit.number,
        );
        schema.execute(query).await.into_result().unwrap();
        workflows_endpoint.assert_async().await;

        let workflows_endpoint2 = server
            .mock("GET", &format!("/api/v1/workflows/{}", visit)[..])
            .match_query(mockito::Matcher::AllOf(vec![mockito::Matcher::UrlEncoded(
                "listOptions.labelSelector".to_string(),
                "workflows.argoproj.io/phase in (Failed, Error)".to_string(),
            )]))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(workflows_response_file_path)
            .create_async()
            .await;

        let query2 = format!(
            r#"
            query {{
                workflows(
                    visit: {{proposalCode: "{}", proposalNumber: {}, number: {}}}, 
                    filter: {{ failed: true, error: true, succeeded: false, pending: false, running: false }}
                ) {{
                    nodes {{
                        name
                    }}
                }}
            }}
        "#,
            visit.proposal_code, visit.proposal_number, visit.number
        );
        schema.execute(query2).await.into_result().unwrap();
        workflows_endpoint2.assert_async().await;
    }
}
