use super::{Visit, VisitInput, CLIENT};
use crate::ArgoServerUrl;
use argo_workflows_openapi::{
    APIResult, IoArgoprojWorkflowV1alpha1NodeStatus, IoArgoprojWorkflowV1alpha1Workflow,
    IoArgoprojWorkflowV1alpha1WorkflowStatus,
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
enum WorkflowParsingError {
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
#[derive(Debug, SimpleObject)]
struct Workflow {
    /// Metadata containing name, proposal code, proposal number and visit of a workflow
    #[graphql(flatten)]
    metadata: Arc<Metadata>,
    /// The time at which the workflow began running
    status: WorkflowStatus,
}

#[derive(Debug, SimpleObject)]
struct Metadata {
    /// The name given to the workflow, unique within a given visit
    name: String,
    /// The visit the Workflow was run against
    visit: Visit,
}

#[allow(clippy::missing_docs_in_private_items)]
impl Workflow {
    fn new(
        value: IoArgoprojWorkflowV1alpha1Workflow,
        visit: Visit,
    ) -> Result<Self, WorkflowParsingError> {
        let metadata = Arc::new(Metadata {
            name: value.metadata.name.clone().unwrap(),
            visit,
        });
        let status = WorkflowStatus::new(value.status.clone().unwrap(), metadata.clone())?;
        Ok(Self { metadata, status })
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
    /// Creates a new `WorkflowStatus` from `IoArgoprojWorkflowV1alpha1WorkflowStatus` and associated metadata.
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Arc<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        match value.phase.as_deref() {
            Some("Pending") => Ok(Self::Pending(WorkflowPendingStatus::from(value))),
            Some("Running") => Ok(Self::Running(WorkflowRunningStatus::new(value, metadata)?)),
            Some("Succeeded") => Ok(Self::Succeeded(WorkflowSucceededStatus::new(
                value, metadata,
            )?)),
            Some("Failed") => Ok(Self::Failed(WorkflowFailedStatus::new(value, metadata)?)),
            Some("Error") => Ok(Self::Errored(WorkflowErroredStatus::new(value, metadata)?)),
            Some(_) => Err(WorkflowParsingError::UnrecognisedPhase),
            None => Err(WorkflowParsingError::UnrecognisedPhase),
        }
    }
}

/// No tasks within the workflow have been scheduled
#[derive(Debug, SimpleObject)]
struct WorkflowPendingStatus {
    /// A human readable message indicating details about why the workflow is in this condition
    message: Option<String>,
}

impl From<IoArgoprojWorkflowV1alpha1WorkflowStatus> for WorkflowPendingStatus {
    fn from(value: IoArgoprojWorkflowV1alpha1WorkflowStatus) -> Self {
        Self {
            message: value.message,
        }
    }
}

/// At least one of the tasks has been scheduled, but they have not yet all complete
#[derive(Debug, SimpleObject)]
struct WorkflowRunningStatus {
    /// Time at which this workflow started
    start_time: DateTime<Utc>,
    /// A human readable message indicating details about why the workflow is in this condition
    message: Option<String>,
    /// Tasks created by the workflow
    #[graphql(flatten)]
    tasks: Tasks,
}

impl WorkflowRunningStatus {
    /// Creates a new `WorkflowRunningStatus` from `IoArgoprojWorkflowV1alpha1WorkflowStatus` and associated metadata.
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Arc<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).into_tasks(metadata)?,
        })
    }
}

/// All tasks in the workflow have succeeded
#[derive(Debug, SimpleObject)]
struct WorkflowSucceededStatus {
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

impl WorkflowSucceededStatus {
    /// Creates a new `WorkflowSucceededStatus` from `IoArgoprojWorkflowV1alpha1WorkflowStatus` and associated metadata.
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Arc<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).into_tasks(metadata)?,
        })
    }
}

/// A task in the workflow has completed with a non-zero exit code
#[derive(Debug, SimpleObject)]
// #[graphql(complex)]
struct WorkflowFailedStatus {
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

impl WorkflowFailedStatus {
    /// Creates a new `WorkflowFailedStatus` from `IoArgoprojWorkflowV1alpha1WorkflowStatus` and associated metadata.
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Arc<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).into_tasks(metadata)?,
        })
    }
}

/// The controller has encountered an error whilst scheduling the workflow
#[derive(Debug, SimpleObject)]
struct WorkflowErroredStatus {
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

impl WorkflowErroredStatus {
    /// Creates a new `WorkflowErroredStatus` from `IoArgoprojWorkflowV1alpha1WorkflowStatus` and associated metadata.
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Arc<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).into_tasks(metadata)?,
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
#[derive(Debug, SimpleObject, Clone)]
struct Task {
    /// Unique name of the task
    id: String,
    /// Display name of the task
    name: String,
    /// Current status of a task
    status: TaskStatus,
    /// Parent of a task
    depends: Vec<String>,
    /// Children of a task
    dependencies: Vec<String>,
}

impl Task {
    /// Create a task from node status and its dependencies
    fn new(
        node_status: argo_workflows_openapi::IoArgoprojWorkflowV1alpha1NodeStatus,
        depends: Vec<String>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            id: node_status.id,
            name: node_status
                .display_name
                .ok_or(WorkflowParsingError::UnrecognisedTaskDisplayName)?
                .to_string(),
            status: TaskStatus::try_from(
                node_status
                    .phase
                    .ok_or(WorkflowParsingError::UnrecognisedTaskPhase)?
                    .to_string(),
            )?,
            depends,
            dependencies: node_status.children,
        })
    }
}

#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug)]
enum Tasks {
    Fetched(Vec<Task>),
    UnFetched(Arc<Metadata>),
}

#[Object]
impl Tasks {
    #[allow(clippy::missing_docs_in_private_items)]
    async fn tasks(&self, ctx: &Context<'_>) -> anyhow::Result<Vec<Task>> {
        match self {
            Tasks::Fetched(tasks) => Ok(tasks.clone()),
            Tasks::UnFetched(metadata) => {
                let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
                let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
                let mut url = server_url.clone();
                url.path_segments_mut().unwrap().extend([
                    "api",
                    "v1",
                    "workflows",
                    &metadata.visit.to_string(),
                    &metadata.name,
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
                Ok(match TaskMap(nodes).into_tasks(metadata.clone())? {
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
    fn into_tasks(self, metadata: Arc<Metadata>) -> Result<Tasks, WorkflowParsingError> {
        let mut relationship_map = TaskMap::generate_relationship_map(&self);
        if self.0.is_empty() {
            return Ok(Tasks::UnFetched(metadata));
        }
        let tasks = self
            .0
            .into_iter()
            .map(|(node_name, node_status)| {
                let depends = relationship_map.remove(&node_name).unwrap_or_default();
                Task::new(node_status, depends)
            })
            .collect::<Result<Vec<_>, _>>()?;
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
        Ok(Workflow::new(workflow, visit.into())?)
    }

    #[instrument(skip(self, ctx))]
    async fn workflows(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        cursor: Option<String>,
        #[graphql(validator(minimum = 1, maximum = 10))] limit: Option<u32>,
    ) -> anyhow::Result<Connection<OpaqueCursor<usize>, Workflow, EmptyFields, EmptyFields>> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let mut url = server_url.clone();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "workflows", &visit.to_string()]);
        let limit = limit.unwrap_or(10);
        url.query_pairs_mut()
            .append_pair("listOptions.limit", &limit.to_string());
        let current_index = if let Some(cursor) = cursor {
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
            .collect::<Result<Vec<_>, _>>()?;
        let mut connection =
            Connection::new(false, workflows_response.metadata.continue_.is_some());
        connection
            .edges
            .extend(workflows.into_iter().enumerate().map(|(idx, workflow)| {
                let cursor = OpaqueCursor(current_index + idx + 1);
                Edge::new(cursor, workflow)
            }));
        Ok(connection)
    }
}
