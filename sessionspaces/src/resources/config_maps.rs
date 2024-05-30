use k8s_openapi::api::core::v1::ConfigMap;
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    Api, Client,
};
use ldap3::{result::Result, LdapConnAsync, Scope, SearchEntry};
use std::collections::BTreeMap;
use tracing::{info, instrument};

const POLICY_CONFIG: &str = "policy-config";

pub async fn ldap_search(namespace: String) -> Result<()> {
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
        .await?
        .success()?;
    for entry in rs {
        println!("{:?}", SearchEntry::construct(entry));
    }
    Ok(ldap.unbind().await?)
}

#[instrument(skip(k8s_client))]
pub async fn create_configmap(
    namespace: String,
    k8s_client: Client,
) -> std::result::Result<(), kube::Error> {
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
