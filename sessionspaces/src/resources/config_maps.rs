use super::{MANAGED_BY, MANAGED_BY_LABEL};
use crate::Sessionspace;
use itertools::Itertools;
use k8s_openapi::api::core::v1::ConfigMap;
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    Api, Client,
};
use std::collections::BTreeMap;
use tracing::{info, instrument};

/// The name to be given to the ConfigMap
const NAME: &str = "sessionspaces";

#[instrument(skip(k8s_client))]
pub async fn create_configmap(
    namespace: &str,
    sessionspace: Sessionspace,
    k8s_client: Client,
) -> std::result::Result<(), kube::Error> {
    let configmaps = Api::<ConfigMap>::namespaced(k8s_client, namespace);
    let members = format!(
        "[{}]",
        sessionspace
            .members
            .iter()
            .map(|s| format!(r#""{}""#, s))
            .join(", ")
    );
    let mut configmap_data = BTreeMap::from([
        ("proposal_code".to_string(), sessionspace.proposal_code),
        (
            "proposal_number".to_string(),
            sessionspace.proposal_number.to_string(),
        ),
        ("visit".to_string(), sessionspace.visit.to_string()),
        ("beamline".to_string(), sessionspace.beamline),
        ("members".to_string(), members),
    ]);
    if let Some(gid) = sessionspace.gid {
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
                    labels: Some(BTreeMap::from([(
                        MANAGED_BY_LABEL.to_string(),
                        MANAGED_BY.to_string(),
                    )])),
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
