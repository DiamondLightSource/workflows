use async_graphql::Object;
use kube::{
    api::{ObjectMeta, PostParams},
    Api, Client, CustomResource,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(CustomResource, Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[kube(
    group = "workflows.diamond.ac.uk",
    version = "v1alpha1",
    kind = "Trigger",
    namespaced
)]
struct TriggerSpec {
    template_ref: String,
}

#[derive(Debug, Clone, Default)]
pub struct TriggerMutation;

#[Object]
impl TriggerMutation {
    // #[instrument(name = "graph_proxy_create_trigger", skip(self))]
    async fn create_trigger(&self, template_ref: String) -> anyhow::Result<Trigger> {
        let client = Client::try_default().await?;
        let api: Api<Trigger> = Api::namespaced(client.clone(), "events");

        let trigger = Trigger {
            metadata: ObjectMeta {
                generate_name: Some(format!("{}-trigger-", template_ref)),
                name: None,
                ..Default::default()
            },
            spec: TriggerSpec { template_ref },
        };
        let o: Trigger = api.create(&PostParams::default(), &trigger).await?;
        Ok(o)
    }
}
