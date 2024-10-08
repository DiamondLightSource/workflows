use crate::ArgoServerUrl;
use argo_workflows_openapi::APIResult;
use async_graphql::{Context, Object, SimpleObject};
use axum_extra::headers::{authorization::Bearer, Authorization};
use std::ops::Deref;
use tracing::{debug, instrument};

#[derive(Debug, thiserror::Error)]
#[allow(clippy::missing_docs_in_private_items)]
enum WorkflowTemplateParsingError {}

/// A Template which specifies how to produce a [`Workflow`]
#[derive(Debug, SimpleObject)]
struct WorkflowTemplate {
    /// The name given to the workflow template, globally unique
    name: String,
}

impl TryFrom<argo_workflows_openapi::IoArgoprojWorkflowV1alpha1ClusterWorkflowTemplate>
    for WorkflowTemplate
{
    type Error = WorkflowTemplateParsingError;

    fn try_from(
        value: argo_workflows_openapi::IoArgoprojWorkflowV1alpha1ClusterWorkflowTemplate,
    ) -> Result<Self, Self::Error> {
        Ok(Self {
            name: value.metadata.name.unwrap(),
        })
    }
}

/// Queries related to [`WorkflowTemplate`]s
#[derive(Debug, Clone, Default)]
pub struct WorkflowTemplatesQuery;

#[Object]
impl WorkflowTemplatesQuery {
    #[instrument(skip(self, ctx))]
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
        let client = reqwest::Client::new();
        let request = if let Some(auth_token) = auth_token {
            client.get(url).bearer_auth(auth_token.token())
        } else {
            client.get(url)
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
        Ok(workflow_templates.try_into()?)
    }

    #[instrument(skip(self, ctx))]
    async fn workflow_templates(&self, ctx: &Context<'_>) -> anyhow::Result<Vec<WorkflowTemplate>> {
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let auth_token = ctx.data_unchecked::<Option<Authorization<Bearer>>>();
        let mut url = server_url.clone();
        url.path_segments_mut()
            .unwrap()
            .extend(["api", "v1", "cluster-workflow-templates"]);
        debug!("Retrieving workflow templates from {url}");
        let client = reqwest::Client::new();
        let request = if let Some(auth_token) = auth_token {
            client.get(url).bearer_auth(auth_token.token())
        } else {
            client.get(url)
        };
        let workflow_templates =
            request
                .send()
                .await?
                .json::<APIResult<
                    argo_workflows_openapi::IoArgoprojWorkflowV1alpha1ClusterWorkflowTemplateList,
                >>()
                .await?
                .into_result()?;
        Ok(workflow_templates
            .items
            .into_iter()
            .map(TryInto::try_into)
            .collect::<Result<Vec<_>, _>>()?)
    }
}
