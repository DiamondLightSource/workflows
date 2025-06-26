use async_graphql::{Context, Object, Subscription};
use kube::{
    api::{DynamicObject, GroupVersionKind},
    discovery,
    runtime::{watcher, WatchStreamExt},
    Api, Client, Config,
};

use futures_util::Stream;
use secrecy::SecretString;
use std::ops::Deref;
use tokio_stream::StreamExt;

use crate::{graphql::VisitInput, KubernetesApiUrl};

/// Subscriptions relating to the Workflow object
#[derive(Debug, Clone, Default)]
pub struct SubscribeWorkflows;

#[Subscription]
impl SubscribeWorkflows {
    /// Processing to subscribe to data for all workflows in a session
    async fn workflows(
        &self,
        ctx: &Context<'_>,
        session: VisitInput,
    ) -> anyhow::Result<impl Stream<Item = WorkflowChange>> {
        let token = ctx.data_unchecked::<Option<String>>();
        let token = if let Some(token) = token {
            token.clone().into_boxed_str()
        } else {
            return Err(anyhow::anyhow!("No authentication token provided"));
        };

        let kube_api_url = ctx.data_unchecked::<KubernetesApiUrl>().deref();

        let mut cfg = Config::new(kube_api_url.to_owned());
        cfg.default_namespace = session.to_string();
        cfg.auth_info.token = Some(SecretString::new(token));
        let client = Client::try_from(cfg)?;

        let gvk = GroupVersionKind::gvk("argoproj.io", "v1alpha1", "Workflow");
        let (resource, _capabilities) = discovery::pinned_kind(&client, &gvk).await?;
        let workflows: Api<DynamicObject> =
            Api::namespaced_with(client, &session.to_string(), &resource);
        let wc = watcher::Config::default();

        let stream = watcher(workflows, wc).applied_objects().filter_map(|wf| {
            let resp = &wf
                .unwrap()
                .metadata
                .name
                .expect("Workflow is missing a name.");
            Some(WorkflowChange { name: resp.clone() })
        });

        Ok(stream)
    }
}

/// Workflow data accessible via the graph
struct WorkflowChange {
    /// The name of the workflow
    name: String,
}

#[Object]
impl WorkflowChange {
    async fn name(&self) -> &str {
        &self.name
    }
}
