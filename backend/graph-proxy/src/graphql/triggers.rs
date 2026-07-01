use crate::graphql::auth_guard::AuthGuard;
use async_graphql::{Object, SimpleObject};
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
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
#[graphql(name = "Trigger")]
struct TriggerGQL {
    name: Option<String>,
    #[serde(rename(deserialize = "templateRef"))]
    template_ref: String,
}

impl From<Trigger> for TriggerGQL {
    fn from(t: Trigger) -> Self {
        Self {
            name: t.metadata.name,
            template_ref: t.spec.template_ref,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct TriggerMutation;

#[Object(guard = "AuthGuard")]
impl TriggerMutation {
    // #[instrument(name = "graph_proxy_create_trigger", skip(self))]
    async fn create_trigger(&self, template_ref: String) -> anyhow::Result<TriggerGQL> {
        println!("Started creating trigger");
        let client = Client::try_default().await?;
        println!("Client created");
        let api: Api<Trigger> = Api::namespaced(client.clone(), "events");
        println!("Api created");
        let trigger = Trigger {
            metadata: ObjectMeta {
                generate_name: Some(format!("{}-trigger-", template_ref)),
                name: None,
                ..Default::default()
            },
            spec: TriggerSpec { template_ref },
        };
        println!("Trigger created");
        let creation: Trigger = api.create(&PostParams::default(), &trigger).await?;
        println!("Creation finished");
        Ok(creation.into())
    }
}
