use k8s_openapi::api::core::v1::ConfigMap;
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    Api, Client,
};
use std::collections::{BTreeMap, BTreeSet};
use tracing::{info, instrument};

/// The name to be given to the ConfigMap
const NAME: &str = "sessionspaces";

#[instrument(skip(k8s_client))]
pub async fn create_configmap(
    namespace: String,
    session_code: String,
    session_number: u32,
    visit_number: u32,
    gid_number: Option<String>,
    members: Option<BTreeSet<String>>,
    k8s_client: Client,
) -> std::result::Result<(), kube::Error> {
    let configmaps = Api::<ConfigMap>::namespaced(k8s_client, &namespace);
    let mut configmap_data = BTreeMap::from([
        ("session_code".to_string(), session_code),
        ("session_number".to_string(), session_number.to_string()),
        ("visit_number".to_string(), visit_number.to_string()),
    ]);
    if let Some(members_set) = members {
        let quoted_members: Vec<String> =
            members_set.iter().map(|s| format!("\"{}\"", s)).collect();
        configmap_data.insert(
            "members".to_string(),
            format!("[{}]", quoted_members.join(", ")),
        );
    }
    if let Some(gid) = gid_number {
        configmap_data.insert("gid".to_string(), gid);
    }
    configmaps
        .patch(
            NAME,
            &PatchParams {
                field_manager: Some("kubectl".to_string()),
                ..Default::default()
            },
            &Patch::Apply(&ConfigMap {
                metadata: ObjectMeta {
                    name: Some(NAME.to_string()),
                    ..Default::default()
                },
                data: Some(configmap_data),
                ..Default::default()
            }),
        )
        .await?;

    info!("ConfigMap {NAME} created");
    Ok(())
}
