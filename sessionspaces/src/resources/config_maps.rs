use super::{MANAGED_BY, MANAGED_BY_LABEL};
use crate::{instruments::Instrument::*, permissionables::Session};
use k8s_openapi::api::core::v1::ConfigMap;
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    Api, Client,
};
use std::{collections::BTreeMap, path::PathBuf};
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
        ("proposal_code".to_string(), session.proposal_code.clone()),
        (
            "proposal_number".to_string(),
            session.proposal_number.to_string(),
        ),
        ("visit".to_string(), session.visit.to_string()),
        ("instrument".to_string(), session.instrument.to_string()),
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
    if let Some(mount_path) = match session.instrument {
        B07 | B07_1 | B16 | B18 | B21 | B22 | B23 | B24 | B24_1 | E01 | E02 | E03 | I03 | I04
        | I04_1 | I05 | I05_1 | I06 | I06_1 | I06_2 | I07 | I08 | I08_1 | I09 | I09_1 | I09_2
        | I10 | I10_1 | I11 | I11_1 | I12 | I13 | I13_1 | I14 | I15 | I15_1 | I16 | I18 | I19
        | I19_1 | I19_2 | I20 | I20_1 | I21 | I22 | I23 | I24 | K11 | M01 | M02 | M03 | M04
        | M05 | M06 | M07 | M08 | M10 | M11 | M12 | M13 | M14 | P02 | P29 | P32 | P33 | P38
        | P45 | P99 | S01 | S02 | S03 | S04 => Some(PathBuf::from_iter([
            "/dls",
            &session.instrument.to_string(),
            "data",
            &session.start_date.year().to_string(),
            &format!(
                "{}{}-{}",
                session.proposal_code, session.proposal_number, session.visit
            ),
        ])),
        _ => None,
    } {
        configmap_data.insert(
            "data_directory".to_string(),
            mount_path
                .to_str()
                .ok_or(anyhow::anyhow!("Data directory was invalid"))?
                .to_string(),
        );
    }
    configmaps
        .patch(
            NAME,
            &PatchParams {
                field_manager: Some("sessionspaces".to_string()),
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

    info!("{NAME} ConfigMap created / updated for {namespace}");
    Ok(())
}
