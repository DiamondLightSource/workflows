use crate::ArgoServerUrl;
use argo_workflows_openapi::{
    APIResult, IoArgoprojWorkflowV1alpha1Workflow, IoArgoprojWorkflowV1alpha1WorkflowStatus,
};
use async_graphql::{Context, Object, SimpleObject, Union};
use axum_extra::headers::{authorization::Bearer, Authorization};
use chrono::{DateTime, Utc};
use std::ops::Deref;
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
}

impl TryFrom<IoArgoprojWorkflowV1alpha1WorkflowStatus> for WorkflowRunningStatus {
    type Error = WorkflowParsingError;

    fn try_from(value: IoArgoprojWorkflowV1alpha1WorkflowStatus) -> Result<Self, Self::Error> {
        Ok(Self {
            start_time: *value
                .started_at
                .ok_or(WorkflowParsingError::MissingStartTime)?,
            message: value.message,
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
        })
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
}
