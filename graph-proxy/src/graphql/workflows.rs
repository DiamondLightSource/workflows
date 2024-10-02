use crate::ArgoServerUrl;
use argo_workflows_openapi::{
    APIResult, IoArgoprojWorkflowV1alpha1NodeStatus, IoArgoprojWorkflowV1alpha1Workflow,
    IoArgoprojWorkflowV1alpha1WorkflowStatus,
};
use async_graphql::{
    types::connection::*, ComplexObject, Context, Enum, Object, SimpleObject, Union,
};
use axum_extra::headers::{authorization::Bearer, Authorization};
use chrono::{DateTime, Utc};
use lazy_static::lazy_static;
use std::sync::{Arc, Weak};
use std::{collections::HashMap, ops::Deref};
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
    /// Reference to Workflow metadata
    #[graphql(flatten)]
    metadata: Arc<Metadata>,
    /// The time at which the workflow began running
    status: WorkflowStatus,
}

#[derive(Debug, SimpleObject)]
struct Metadata {
    /// The name given to the workflow, unique within a given visit
    name: String,
    /// Project Proposal Code
    proposal_code: String,
    /// Project Proposal Number
    proposal_number: u32,
    /// Session visit Number
    visit: u32,
}

#[allow(clippy::missing_docs_in_private_items)]
impl Workflow {
    fn new(
        value: IoArgoprojWorkflowV1alpha1Workflow,
        proposal_code: String,
        proposal_number: u32,
        visit: u32,
    ) -> Result<Self, WorkflowParsingError> {
        let metadata = Arc::new(Metadata {
            name: value.metadata.name.clone().unwrap(),
            proposal_code,
            proposal_number,
            visit,
        });
        let status = WorkflowStatus::new(value.status.clone().unwrap(), Arc::downgrade(&metadata))?;
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

#[allow(clippy::missing_docs_in_private_items)]
impl WorkflowStatus {
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Weak<Metadata>,
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

lazy_static! {
    static ref CLIENT: reqwest::Client = reqwest::Client::new();
}

#[allow(clippy::missing_docs_in_private_items)]
macro_rules! fetch_tasks {
    ($status:expr, $ctx:expr) => {{
        if $status.tasks.is_none() {
            let server_url = $ctx.data_unchecked::<ArgoServerUrl>().deref();
            let auth_token = $ctx.data_unchecked::<Option<Authorization<Bearer>>>();
            let mut url = server_url.clone();
            let metadata = &$status.metadata.upgrade().unwrap();
            let namespace = format!(
                "{}{}-{}",
                metadata.proposal_code, metadata.proposal_number, metadata.visit
            );
            url.path_segments_mut().unwrap().extend([
                "api",
                "v1",
                "workflows",
                &namespace,
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
                .unwrap()
                .nodes;
            let tasks: Option<Vec<Task>> = TaskMap(nodes).try_into()?;
            return Ok(tasks);
        }
        Ok($status.tasks.clone())
    }};
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
#[graphql(complex)]
struct WorkflowRunningStatus {
    /// Time at which this workflow started
    start_time: DateTime<Utc>,
    /// A human readable message indicating details about why the workflow is in this condition
    message: Option<String>,
    /// Tasks created by the workflow
    #[graphql(skip)]
    tasks: Option<Vec<Task>>,
    /// Workflow metadata
    #[graphql(skip)]
    metadata: Weak<Metadata>,
}

#[allow(clippy::missing_docs_in_private_items)]
impl WorkflowRunningStatus {
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Weak<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).try_into()?,
            metadata,
        })
    }
}

#[ComplexObject]
#[allow(clippy::missing_docs_in_private_items)]
impl WorkflowRunningStatus {
    async fn tasks(&self, ctx: &Context<'_>) -> anyhow::Result<Option<Vec<Task>>> {
        fetch_tasks!(&self, ctx)
    }
}

/// All tasks in the workflow have succeeded
#[derive(Debug, SimpleObject)]
#[graphql(complex)]
struct WorkflowSucceededStatus {
    /// Time at which this workflow started
    start_time: DateTime<Utc>,
    /// Time at which this workflow completed
    end_time: DateTime<Utc>,
    /// A human readable message indicating details about why the workflow is in this condition
    message: Option<String>,
    /// Tasks created by the workflow
    #[graphql(skip)]
    tasks: Option<Vec<Task>>,
    /// Workflow metadata
    #[graphql(skip)]
    metadata: Weak<Metadata>,
}

#[allow(clippy::missing_docs_in_private_items)]
impl WorkflowSucceededStatus {
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Weak<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).try_into()?,
            metadata,
        })
    }
}

#[allow(clippy::missing_docs_in_private_items)]
#[ComplexObject]
impl WorkflowSucceededStatus {
    async fn tasks(&self, ctx: &Context<'_>) -> anyhow::Result<Option<Vec<Task>>> {
        fetch_tasks!(&self, ctx)
    }
}

/// A task in the workflow has completed with a non-zero exit code
#[derive(Debug, SimpleObject)]
#[graphql(complex)]
struct WorkflowFailedStatus {
    /// Time at which this workflow started
    start_time: DateTime<Utc>,
    /// Time at which this workflow completed
    end_time: DateTime<Utc>,
    /// A human readable message indicating details about why the workflow is in this condition
    message: Option<String>,
    /// Tasks created by the workflow
    #[graphql(skip)]
    tasks: Option<Vec<Task>>,
    /// Workflow metadata
    #[graphql(skip)]
    metadata: Weak<Metadata>,
}

#[allow(clippy::missing_docs_in_private_items)]
impl WorkflowFailedStatus {
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Weak<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).try_into()?,
            metadata,
        })
    }
}

#[allow(clippy::missing_docs_in_private_items)]
#[ComplexObject]
impl WorkflowFailedStatus {
    async fn tasks(&self, ctx: &Context<'_>) -> anyhow::Result<Option<Vec<Task>>> {
        fetch_tasks!(&self, ctx)
    }
}

/// The controller has encountered an error whilst scheduling the workflow
#[derive(Debug, SimpleObject)]
#[graphql(complex)]
struct WorkflowErroredStatus {
    /// Time at which this workflow started
    start_time: DateTime<Utc>,
    /// Time at which this workflow completed
    end_time: DateTime<Utc>,
    /// A human readable message indicating details about why the workflow is in this condition
    message: Option<String>,
    /// Tasks created by the workflow
    #[graphql(skip)]
    tasks: Option<Vec<Task>>,
    /// Workflow metadata
    #[graphql(skip)]
    metadata: Weak<Metadata>,
}

#[allow(clippy::missing_docs_in_private_items)]
impl WorkflowErroredStatus {
    fn new(
        value: IoArgoprojWorkflowV1alpha1WorkflowStatus,
        metadata: Weak<Metadata>,
    ) -> Result<Self, WorkflowParsingError> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).try_into()?,
            metadata,
        })
    }
}

#[allow(clippy::missing_docs_in_private_items)]
#[ComplexObject]
impl WorkflowErroredStatus {
    async fn tasks(&self, ctx: &Context<'_>) -> anyhow::Result<Option<Vec<Task>>> {
        fetch_tasks!(&self, ctx)
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
}

impl TryFrom<TaskMap> for Option<Vec<Task>> {
    type Error = WorkflowParsingError;

    fn try_from(value: TaskMap) -> Result<Self, Self::Error> {
        let mut relationship_map = value.generate_relationship_map();
        if value.0.is_empty() {
            Ok(None)
        } else {
            let tasks = value
                .0
                .into_iter()
                .map(|(node_name, node_status)| {
                    let depends = relationship_map.remove(&node_name).unwrap_or_default();
                    Task::new(node_status, depends)
                })
                .collect::<Result<Vec<_>, _>>()?;
            Ok(Some(tasks))
        }
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
        proposal_code: String,
        proposal_number: u32,
        visit: u32,
        name: String,
    ) -> anyhow::Result<Workflow> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let namespace = format!("{}{}-{}", proposal_code, proposal_number, visit);
        let mut url = server_url.clone();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "workflows", &namespace, &name]);
        debug!("Retrieving workflow from {url}");
        let client = reqwest::Client::new();
        let request = if let Some(auth_token) = auth_token {
            client.get(url).bearer_auth(auth_token.token())
        } else {
            client.get(url)
        };
        let workflow = request
            .send()
            .await?
            .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow>>()
            .await?
            .into_result()?;
        Ok(Workflow::new(
            workflow,
            proposal_code,
            proposal_number,
            visit,
        )?)
    }

    #[instrument(skip(self, ctx))]
    async fn workflows(
        &self,
        ctx: &Context<'_>,
        proposal_code: String,
        proposal_number: u32,
        visit: u32,
        cursor: Option<String>,
        #[graphql(validator(minimum = 1, maximum = 10))] limit: Option<u32>,
    ) -> anyhow::Result<Connection<OpaqueCursor<String>, Workflow, EmptyFields, EmptyFields>> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let namespace = format!("{}{}-{}", proposal_code, proposal_number, visit);
        let client = reqwest::Client::new();
        let request = |url: reqwest::Url| {
            if let Some(auth_token) = auth_token {
                client.get(url).bearer_auth(auth_token.token())
            } else {
                client.get(url)
            }
        };
        let mut url = server_url.clone();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "workflows", &namespace]);
        let limit = limit.unwrap_or(10);
        url.query_pairs_mut()
            .append_pair("listOptions.limit", &limit.to_string());
        let current_cursor = if let Some(cursor) = cursor {
            let cursor_value = OpaqueCursor::<String>::decode_cursor(&cursor)
                .map_err(|_| anyhow::Error::msg("Cursor not valid"))?;
            url.query_pairs_mut()
                .append_pair("listOptions.continue", &cursor_value.0);
            Some(cursor_value.0)
        } else {
            None
        };
        debug!("Retrieving workflows name from {url}");
        let workflows_response = request(url)
            .send()
            .await?
            .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowList>>()
            .await?
            .into_result()?;
        let next_cursor = workflows_response.metadata.continue_;
        let workflows = workflows_response
            .items
            .into_iter()
            .map(|workflow| Workflow::new(workflow, proposal_code.clone(), proposal_number, visit))
            .collect::<Result<Vec<_>, _>>()?;
        let current_index = current_cursor
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(0);

        let mut connection = Connection::new(false, next_cursor.is_some());
        connection
            .edges
            .extend(workflows.into_iter().enumerate().map(|(idx, workflow)| {
                let cursor = OpaqueCursor((current_index + idx + 1).to_string());
                Edge::new(cursor, workflow)
            }));
        Ok(connection)
    }
}
