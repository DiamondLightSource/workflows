use crate::ArgoServerUrl;
use argo_workflows_openapi::{
    APIResult, IoArgoprojWorkflowV1alpha1NodeStatus, IoArgoprojWorkflowV1alpha1Workflow,
    IoArgoprojWorkflowV1alpha1WorkflowStatus,
};
use async_graphql::{types::connection::*, Context, Enum, Object, SimpleObject, Union};
use axum_extra::headers::{authorization::Bearer, Authorization};
use chrono::{DateTime, Utc};
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
    /// The name given to the workflow, unique within a given visit
    name: String,
    /// The time at which the workflow began running
    status: WorkflowStatus,
}

impl TryFrom<IoArgoprojWorkflowV1alpha1Workflow> for Workflow {
    type Error = WorkflowParsingError;

    fn try_from(value: IoArgoprojWorkflowV1alpha1Workflow) -> Result<Self, Self::Error> {
        Ok(Self {
            name: value.metadata.name.unwrap(),
            status: value.status.unwrap().try_into()?,
        })
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

impl TryFrom<IoArgoprojWorkflowV1alpha1WorkflowStatus> for WorkflowStatus {
    type Error = WorkflowParsingError;

    fn try_from(value: IoArgoprojWorkflowV1alpha1WorkflowStatus) -> Result<Self, Self::Error> {
        match value.phase.as_deref() {
            Some("Pending") => Ok(Self::Pending(WorkflowPendingStatus::from(value))),
            Some("Running") => Ok(Self::Running(WorkflowRunningStatus::try_from(value)?)),
            Some("Succeeded") => Ok(Self::Succeeded(WorkflowSucceededStatus::try_from(value)?)),
            Some("Failed") => Ok(Self::Failed(WorkflowFailedStatus::try_from(value)?)),
            Some("Error") => Ok(Self::Errored(WorkflowErroredStatus::try_from(value)?)),
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
    tasks: Vec<Task>,
}

impl TryFrom<IoArgoprojWorkflowV1alpha1WorkflowStatus> for WorkflowRunningStatus {
    type Error = WorkflowParsingError;

    fn try_from(value: IoArgoprojWorkflowV1alpha1WorkflowStatus) -> Result<Self, Self::Error> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).try_into()?,
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
    tasks: Vec<Task>,
}

impl TryFrom<IoArgoprojWorkflowV1alpha1WorkflowStatus> for WorkflowSucceededStatus {
    type Error = WorkflowParsingError;

    fn try_from(value: IoArgoprojWorkflowV1alpha1WorkflowStatus) -> Result<Self, Self::Error> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).try_into()?,
        })
    }
}

/// A task in the workflow has completed with a non-zero exit code
#[derive(Debug, SimpleObject)]
struct WorkflowFailedStatus {
    /// Time at which this workflow started
    start_time: DateTime<Utc>,
    /// Time at which this workflow completed
    end_time: DateTime<Utc>,
    /// A human readable message indicating details about why the workflow is in this condition
    message: Option<String>,
    /// Tasks created by the workflow
    tasks: Vec<Task>,
}

impl TryFrom<IoArgoprojWorkflowV1alpha1WorkflowStatus> for WorkflowFailedStatus {
    type Error = WorkflowParsingError;

    fn try_from(value: IoArgoprojWorkflowV1alpha1WorkflowStatus) -> Result<Self, Self::Error> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).try_into()?,
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
    tasks: Vec<Task>,
}

impl TryFrom<IoArgoprojWorkflowV1alpha1WorkflowStatus> for WorkflowErroredStatus {
    type Error = WorkflowParsingError;

    fn try_from(value: IoArgoprojWorkflowV1alpha1WorkflowStatus) -> Result<Self, Self::Error> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            end_time: *value
                .finished_at
                .ok_or(WorkflowParsingError::MissingEndTime)?,
            message: value.message,
            tasks: TaskMap(value.nodes).try_into()?,
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
#[derive(Debug, SimpleObject)]
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

impl TryFrom<TaskMap> for Vec<Task> {
    type Error = WorkflowParsingError;

    fn try_from(value: TaskMap) -> Result<Self, Self::Error> {
        let mut relationship_map = value.generate_relationship_map();

        let tasks = value
            .0
            .into_iter()
            .map(|(node_name, node_status)| {
                let depends = relationship_map.remove(&node_name).unwrap_or_default();
                Task::new(node_status, depends)
            })
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tasks)
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
        Ok(workflow.try_into()?)
    }

    #[instrument(skip(self, ctx))]
    async fn workflows(
        &self,
        ctx: &Context<'_>,
        proposal_code: String,
        proposal_number: u32,
        visit: u32,
        cursor: Option<String>,
        #[graphql(validator(minimum=1, maximum=10))] limit: Option<u32>,
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
        let mut join_set = tokio::task::JoinSet::new();
        let mut workflows = Vec::new();
        let next_cursor = workflows_response.metadata.continue_;
        if ctx
            .look_ahead()
            .field("nodes")
            .field("status")
            .field("tasks")
            .exists()
            || ctx
                .look_ahead()
                .field("edges")
                .field("node")
                .field("status")
                .field("tasks")
                .exists()
        {
            for workflow in workflows_response.items.into_iter().filter_map(|workflow| {
                let workflow_name = workflow.metadata.name?;
                let mut workflow_url = server_url.clone();
                workflow_url.path_segments_mut().unwrap().extend([
                    "api",
                    "v1",
                    "workflows",
                    &namespace,
                    &workflow_name,
                ]);
                debug!("Retrieving workflow from {workflow_url}");
                let request = request(workflow_url);
                Some((workflow_name, request))
            }) {
                join_set.spawn(async move {
                    let request = workflow.1;
                    let workflow = request
                    .send()
                    .await?
                    .json::<APIResult<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow>>()
                    .await?
                    .into_result()?;
                    Ok::<Workflow, anyhow::Error>(workflow.try_into()?)
                });
            }

            while let Some(result) = join_set.join_next().await {
                workflows.push(result??);
            }
        } else {
            workflows = workflows_response
                .items
                .into_iter()
                .map(|workflow| workflow.try_into())
                .collect::<Result<Vec<_>, _>>()?;
        }
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
