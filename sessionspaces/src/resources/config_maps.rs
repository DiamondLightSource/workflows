use super::{BL_WITH_PATH, MANAGED_BY, MANAGED_BY_LABEL};
use crate::permissionables::Session;
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
    session: Session,
    k8s_client: Client,
) -> std::result::Result<(), anyhow::Error> {
    let configmaps = Api::<ConfigMap>::namespaced(k8s_client, namespace);
    let mut configmap_data = BTreeMap::from([
        ("proposal_code".to_string(), session.proposal_code),
        (
            "proposal_number".to_string(),
            session.proposal_number.to_string(),
        ),
        ("visit".to_string(), session.visit.to_string()),
        ("beamline".to_string(), session.beamline.clone()),
        (
            "members".to_string(),
            serde_json::to_string(&session.members)?,
        ),
        ("start_date".to_string(), session.start_date.to_string()),
        ("end_date".to_string(), session.end_date.to_string()),
    ]);
    if let Some(gid) = session.gid {
        configmap_data.insert("gid".to_string(), gid);
    }
    if BL_WITH_PATH.contains(&session.beamline.as_str()) {
        let mount_path = format!(
            "/dls/{}/data/{}/{}",
            session.beamline,
            session.start_date.year(),
            namespace
        );
        configmap_data.insert("dataDirectory".to_string(), mount_path);
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
