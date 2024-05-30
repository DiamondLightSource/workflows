use std::collections::BTreeMap;

use k8s_openapi::api::core::v1::ConfigMap;
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    Api, Client,
};
use tracing::{info, instrument};

const POLICY_CONFIG: &str = "policy-config";

#[instrument(skip(k8s_client))]
pub async fn create_configmap(namespace: String, k8s_client: Client) -> Result<(), kube::Error> {
    let configmaps = Api::<ConfigMap>::namespaced(k8s_client, &namespace);
    let configmap_data = BTreeMap::from([("session".to_string(), "gid".to_string())]);

    configmaps
        .patch(
            POLICY_CONFIG,
            &PatchParams {
                field_manager: Some("kubectl".to_string()),
                ..Default::default()
            },
            &Patch::Apply(&ConfigMap {
                metadata: ObjectMeta {
                    name: Some(POLICY_CONFIG.to_string()),
                    ..Default::default()
                },
                data: Some(configmap_data),
                ..Default::default()
            }),
        )
        .await?;

    info!("ConfigMap {POLICY_CONFIG} created");
    Ok(())
}
