use super::{Visit, VisitInput, CLIENT};
use crate::{graphql::filters::WorkflowFilter, ArgoServerUrl, S3Bucket};
use argo_workflows_openapi::{
    APIResult, IoArgoprojWorkflowV1alpha1Artifact, IoArgoprojWorkflowV1alpha1NodeStatus,
    IoArgoprojWorkflowV1alpha1Workflow, IoArgoprojWorkflowV1alpha1WorkflowStatus,
};
use async_graphql::{
    connection::{Connection, CursorType, Edge, EmptyFields, OpaqueCursor},
    Context, Enum, Object, SimpleObject, Union, ID,
};
use aws_sdk_s3::presigning::PresigningConfig;
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
    #[error("s3 client was expected but not present")]
    MissingS3Client,
    #[error("s3 bucket was expected but not present")]
    MissingS3Bucket,
    #[error("invalid presigned s3 url")]
    InvalidPresignedS3Url,
    #[error("No authorisation token was provided")]
    MissingAuthToken,
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
    /// The unique ID derived from the visit and name
    async fn id(&self) -> ID {
        let visit_display = self.metadata.visit.to_string();
        let unique_id = format!("{}:{}", visit_display, self.metadata.name);
        ID::from(unique_id)
    }

    /// The name given to the workflow, unique within a given visit
    async fn name(&self) -> &str {
        &self.metadata.name
    }

    /// The visit the Workflow was run against
    async fn visit(&self) -> &Visit {
        &self.metadata.visit
    }

    /// The current status of the workflow
    async fn status(&self) -> Result<Option<WorkflowStatus<'_>>, WorkflowParsingError> {
        WorkflowStatus::new(&self.manifest, &self.metadata)
    }

    /// The top-level workflow parameters
    async fn parameters(&self) -> Option<HashMap<&str, Option<&str>>> {
        let arguments = self.manifest.spec.arguments.as_ref();

        if let Some(args) = arguments {
            let params = &args.parameters;
            let mut param_map: HashMap<&str, Option<&str>> = HashMap::new();
            params.iter().for_each(|this_parameter| {
                param_map.insert(&this_parameter.name, this_parameter.value.as_deref());
            });
            return Some(param_map);
        }
        None
    }

    /// The name of the template used to run the workflow
    async fn template_ref(&self) -> Option<&str> {
        self.manifest
            .spec
            .workflow_template_ref
            .as_ref()
            .and_then(|template_ref| template_ref.name.as_deref())
    }

    /// The workflow creator
    async fn creator(&self) -> WorkflowCreator {
        WorkflowCreator::from_argo_workflow_labels(&self.manifest.metadata.labels)
    }
}

/// Metadata of a workflow
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
        Ok(TaskMap(nodes).into_tasks())
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
        Ok(TaskMap(nodes).into_tasks())
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
struct Artifact<'a>(&'a IoArgoprojWorkflowV1alpha1Artifact);

#[Object]
impl Artifact<'_> {
    /// The file name of the artifact
    async fn name(&self) -> Result<&str, WorkflowParsingError> {
        artifact_filename(self.0)
    }

    /// The download URL for the artifact
    async fn url(&self, ctx: &Context<'_>) -> Result<Url, WorkflowParsingError> {
        let s3_client = ctx
            .data::<aws_sdk_s3::Client>()
            .map_err(|_| WorkflowParsingError::MissingS3Client)?;
        let s3_bucket = ctx
            .data::<S3Bucket>()
            .map_err(|_| WorkflowParsingError::MissingS3Bucket)?;
        let key = self
            .0
            .s3
            .as_ref()
            .ok_or(WorkflowParsingError::UnrecognisedArtifactStore)?
            .key
            .as_ref()
            .ok_or(WorkflowParsingError::MissingArtifactKey)?;
        let presigning_config = PresigningConfig::builder()
            .expires_in(std::time::Duration::from_secs(3600))
            .build()
            .unwrap();
        s3_client
            .get_object()
            .bucket(s3_bucket.clone())
            .key(key)
            .presigned(presigning_config)
            .await
            .map_err(|_| WorkflowParsingError::InvalidPresignedS3Url)
            .and_then(|req| {
                Url::parse(req.uri()).map_err(|_| WorkflowParsingError::InvalidPresignedS3Url)
            })
    }

    /// The MIME type of the artifact data
    async fn mime_type(&self) -> Result<&str, WorkflowParsingError> {
        let filename = artifact_filename(self.0)?;
        Ok(mime_guess::from_path(filename)
            .first_raw()
            .unwrap_or("application/octet-stream"))
    }
}

/// Get filename of the artifact in s3 bucket
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

    /// Artifacts produced by a task
    async fn artifacts(&self) -> Vec<Artifact<'_>> {
        self.node_status
            .outputs
            .as_ref()
            .map(|outputs| outputs.artifacts.iter().map(Artifact).collect::<Vec<_>>())
            .unwrap_or_default()
    }

    /// Node type - Pod, DAG, etc
    async fn step_type(&self) -> &str {
        &self.node_status.type_
    }

    /// Start time for a task on a workflow
    async fn start_time(&self) -> Option<DateTime<Utc>> {
        self.node_status.started_at.as_ref().map(|time| **time)
    }

    /// End time for a task on a workflow
    async fn end_time(&self) -> Option<DateTime<Utc>> {
        self.node_status.finished_at.as_ref().map(|time| **time)
    }

    /// A human readable message indicating details about why this step is in this condition
    async fn message(&self) -> Option<&str> {
        self.node_status.message.as_deref()
    }
}

/// Fetch missing task information
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
    fn into_tasks(self) -> Vec<Task> {
        let mut relationship_map = TaskMap::generate_relationship_map(&self);
        self.0
            .into_iter()
            .map(|(node_name, node_status)| {
                let depends = relationship_map.remove(&node_name).unwrap_or_default();
                Task {
                    node_status,
                    depends,
                }
            })
            .collect::<Vec<_>>()
    }
}

/// Queries related to [`Workflow`]s
#[derive(Debug, Clone, Default)]
pub struct WorkflowsQuery;

#[Object]
impl WorkflowsQuery {
    /// Get a single [`Workflow`] by proposal, visit, and name
    #[instrument(name = "graph_proxy_workflow", skip(self, ctx))]
    pub async fn workflow(
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

    #[instrument(name = "graph_proxy_workflows", skip(self, ctx))]
    async fn workflows(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        cursor: Option<String>,
        #[graphql(validator(minimum = 1, maximum = 30))] limit: Option<u32>,
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

        let api_result = request
            .send()
            .await?
            .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowList>>()
            .await?;

        let workflows_response = match api_result.into_result() {
            Ok(res) => res,
            Err(_) => {
                return Ok(Connection::new(false, false));
            }
        };

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

/// Information about the creator of a workflow.
#[derive(Debug, Clone, SimpleObject, Eq, PartialEq)]
struct WorkflowCreator {
    /// An identifier unique to the creator of the workflow.
    /// Typically this is the creator's Fed-ID.
    creator_id: String,
}

impl WorkflowCreator {
    /// Creates a new [`WorkflowCreator`] from the given creator ID.
    fn new(creator_id: impl Into<String>) -> Self {
        Self {
            creator_id: creator_id.into(),
        }
    }

    /// Builds a [`WorkflowCreator`] from Argo workflow labels.
    fn from_argo_workflow_labels(labels: &HashMap<String, String>) -> Self {
        let creator_id = labels
            .get("workflows.argoproj.io/creator-preferred-username")
            .or_else(|| labels.get("workflows.argoproj.io/creator"))
            .cloned()
            .unwrap_or_default();

        Self::new(creator_id)
    }
}

#[cfg(test)]
mod tests {
    use crate::graphql::{root_schema_builder, Authorization, Bearer, Visit};
    use crate::{ArgoServerUrl, Client, S3Bucket, S3ClientArgs};
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                                startTime
                                endTime
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
                    "tasks": [
                        {
                            "id": workflow_name,
                            "startTime": "2025-01-22T12:29:45+00:00",
                            "endTime": null
                        }
                    ]
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
            .mock("GET", &format!("/api/v1/workflows/{visit}")[..])
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
            .mock("GET", &format!("/api/v1/workflows/{visit}")[..])
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
            .mock("GET", &format!("/api/v1/workflows/{visit}")[..])
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let s3_bucket = S3Bucket("test-bucket".to_string());
        let s3_client_args = S3ClientArgs {
            s3_endpoint_url: None,
            s3_access_key_id: Some("test-access-key".to_string()),
            s3_secret_access_key: Some("test-secret-key".to_string()),
            s3_force_path_style: true,
            s3_region: Some("us-west-2".to_string()),
        };
        let s3_client = Client::from(s3_client_args.clone());
        let artifact_key = format!("{workflow_name}/{workflow_name}/main.log");
        let argo_server_url = Url::parse(&server.url()).unwrap();
        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(None::<Authorization<Bearer>>)
            .data(s3_client)
            .data(s3_bucket.clone())
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

        let resp = schema
            .execute(&query)
            .await
            .into_result()
            .unwrap()
            .data
            .into_json()
            .unwrap();

        workflow_endpoint.assert_async().await;

        let actual_url = resp["workflow"]["status"]["tasks"][0]["artifacts"][0]["url"]
            .as_str()
            .expect("URL should be a string");
        let expected_base = if s3_client_args.s3_force_path_style {
            format!(
                "https://s3.us-west-2.amazonaws.com/{}/{}",
                s3_bucket.0, artifact_key
            )
        } else {
            format!(
                "https://{}.s3.us-west-2.amazonaws.com/{}",
                s3_bucket.0, artifact_key
            )
        };
        assert!(actual_url.starts_with(&expected_base),);
        assert!(actual_url.contains("X-Amz-Algorithm=AWS4-HMAC-SHA256"),);
        assert!(actual_url.contains("X-Amz-Expires=3600"),);
        assert_eq!(
            resp["workflow"]["status"]["tasks"][0]["artifacts"][0]["name"],
            "main.log"
        );
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                    templateRef
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "templateRef": "numpy-benchmark"
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
            .mock("GET", &format!("/api/v1/workflows/{visit}")[..])
            .match_query(mockito::Matcher::AllOf(vec![mockito::Matcher::UrlEncoded(
                "listOptions.labelSelector".to_string(),
                "workflows.argoproj.io/phase in (Error),workflows.argoproj.io/creator-preferred-username=enu43627".to_string(),
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
                    filter: {{ workflowStatusFilter: {{ error: true }}, creator: "enu43627" }}
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
            .mock("GET", &format!("/api/v1/workflows/{visit}")[..])
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
                    filter: {{ workflowStatusFilter: {{ failed: true, error: true, succeeded: false, pending: false, running: false }} }}
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

    #[tokio::test]
    async fn no_workflows_response() {
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;
        let mut workflows_response_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        workflows_response_file_path.push("test-assets");
        workflows_response_file_path.push("get-workflows-null.json");

        let workflows_endpoint = server
            .mock("GET", &format!("/api/v1/workflows/{visit}")[..])
            .match_query(mockito::Matcher::AllOf(vec![mockito::Matcher::UrlEncoded(
                "listOptions.labelSelector".to_string(),
                "workflows.argoproj.io/creator-preferred-username=abc12345".to_string(),
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
                    filter: {{ creator: "abc12345" }}
                ) {{
                    nodes {{
                        name
                    }}
                }}
            }}
        "#,
            visit.proposal_code, visit.proposal_number, visit.number,
        );

        let expected = json!({
            "workflows": {
              "nodes": []
            }
        });

        let response = schema.execute(query).await.into_result().unwrap();
        workflows_endpoint.assert_async().await;
        assert_eq!(response.data.into_json().unwrap(), expected);
    }

    #[tokio::test]
    async fn workflow_parameters() {
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                   parameters
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "parameters": {
                    "memory": "10Gi",
                    "size": "1000"
                }
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }

    #[tokio::test]
    async fn workflow_creator() {
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
                &format!("/api/v1/workflows/{visit}/{workflow_name}")[..],
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
                   creator {{ creatorId }}
                }}
            }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        );
        let resp = schema.execute(query).await.into_result().unwrap();

        workflow_endpoint.assert_async().await;
        let expected_data = json!({
            "workflow": {
                "creator": {
                    "creatorId": "enu43627",
                }
            }
        });
        assert_eq!(resp.data.into_json().unwrap(), expected_data);
    }
}
