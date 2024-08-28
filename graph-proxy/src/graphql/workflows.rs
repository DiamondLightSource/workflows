use crate::ArgoServerUrl;
use argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow;
use async_graphql::{Context, Object, SimpleObject};
use axum_extra::headers::{authorization::Bearer, Authorization};
use std::ops::Deref;
use tracing::{debug, instrument};

/// A Workflow consisting of one or more Tasks
#[derive(Debug, SimpleObject)]
struct Workflow {
    /// The name given to the workflow, unique within a given visit
    name: String,
}

impl From<IoArgoprojWorkflowV1alpha1Workflow> for Workflow {
    fn from(value: IoArgoprojWorkflowV1alpha1Workflow) -> Self {
        Self {
            name: value.metadata.name.unwrap(),
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
            .json::<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow>()
            .await?;
        Ok(workflow.into())
    }
}
