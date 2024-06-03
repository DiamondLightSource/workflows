use k8s_openapi::api::core::v1::ConfigMap;
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    Api, Client,
};
use ldap3::{LdapConnAsync, Scope, SearchEntry};
use std::{
    collections::{BTreeMap, BTreeSet},
    error::Error,
};
use tracing::{info, instrument};

const POLICY_CONFIG: &str = "policy-config";

pub async fn ldap_search(namespace: String) -> Result<String, Box<dyn Error>> {
    let (conn, mut ldap) = LdapConnAsync::new("ldap://ldap.diamond.ac.uk").await?;
    ldap3::drive!(conn);
    let common_name = namespace.replace("-", "_");
    let filter = format!("(&(objectClass=posixgroup)(cn={common_name}))",);
    let (rs, _res) = ldap
        .search(
            "ou=Group,dc=diamond,dc=ac,dc=uk",
            Scope::Subtree,
            &filter,
            vec!["gidnumber"],
        )
        .await
        .unwrap()
        .success()
        .unwrap();
    for entry in rs {
        if let Some(res) = SearchEntry::construct(entry).attrs.get("gidNumber") {
            return Ok(res.concat());
        }
    }
    info!("gidNumber not found for session {}", common_name);
    Err("gidNumber not found".into())
}

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
