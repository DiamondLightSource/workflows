use crate::permissionables::ldap_search;
use k8s_openapi::api::core::v1::ConfigMap;
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    Api, Client,
};
use std::collections::{BTreeMap, BTreeSet};
use tracing::{info, instrument};

const POLICY_CONFIG: &str = "policy-config";

#[instrument(skip(k8s_client))]
pub async fn create_configmap(
    namespace: String,
    session_code: String,
    session_number: u32,
    visit_number: u32,
    members: Option<BTreeSet<String>>,
    k8s_client: Client,
) -> std::result::Result<(), kube::Error> {
    let configmaps = Api::<ConfigMap>::namespaced(k8s_client, &namespace);
    let ldap_result = ldap_search(namespace).await;
    let mut configmap_data = BTreeMap::from([
        ("session_code".to_string(), session_code),
        ("Session_number".to_string(), session_number.to_string()),
        ("visit_number".to_string(), visit_number.to_string()),
    ]);
    match members {
        Some(members_set) => {
            let quoted_members: Vec<String> =
                members_set.iter().map(|s| format!("\"{}\"", s)).collect();
            configmap_data.insert(
                "members".to_string(),
                format!("[{}]", quoted_members.join(", ")),
            );
        }
        None => {}
    };
    match ldap_result {
        Ok(gid) => {
            configmap_data.insert("gid".to_string(), gid);
        }
        Err(_) => {}
    }
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
