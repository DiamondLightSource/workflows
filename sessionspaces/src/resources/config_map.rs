use super::{MANAGED_BY, MANAGED_BY_LABEL};
use crate::permissionables::Session;
use itertools::Itertools;
use k8s_openapi::api::{core::v1::ConfigMap, rbac::v1::Subject};
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    Api, Client,
};
use std::collections::BTreeMap;
use tracing::{info, instrument};

/// The name to be given to the ConfigMap
const NAME: &str = "sessionspaces";

#[instrument(skip(k8s_client, session))]
pub async fn create_configmap(
    namespace: &str,
    session: Session,
    k8s_client: Client,
) -> std::result::Result<(), anyhow::Error> {
    let configmaps = Api::<ConfigMap>::namespaced(k8s_client, namespace);
    let mount_path = session.directory();
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
        (
            "member_refs".to_string(),
            serde_json::to_string(
                &session
                    .members
                    .iter()
                    .map(|member| Subject {
                        kind: "User".to_string(),
                        name: format!("oidc:{member}"),
                        ..Default::default()
                    })
                    .collect_vec(),
            )
            .unwrap(),
        ),
        ("start_date".to_string(), session.start_date.to_string()),
        ("end_date".to_string(), session.end_date.to_string()),
    ]);
    if let Some(gid) = session.gid {
        configmap_data.insert("gid".to_string(), gid.to_string());
    }
    if let Some(mount_path) = mount_path {
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

    info!("ConfigMap {NAME} created / updated for {namespace}");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::create_configmap;
    use crate::{instruments::Instrument, permissionables::Session};
    use k8s_openapi::api::{core::v1::ConfigMap, rbac::v1::Subject};
    use kube::{api::ObjectMeta, Client, Config};
    use std::collections::{BTreeMap, BTreeSet};
    use time::macros::datetime;
    use wiremock::{
        matchers::{body_partial_json, method, path, query_param},
        Mock, MockServer, ResponseTemplate,
    };

    #[tokio::test]
    async fn create_new_configmap() {
        let server = MockServer::start().await;
        let configmap = ConfigMap {
            metadata: ObjectMeta {
                name: Some("sessionspaces".to_string()),
                ..Default::default()
            },
            data: Some(BTreeMap::from([
                ("proposal_code".to_string(), "cm".to_string()),
                ("proposal_number".to_string(), "37235".to_string()),
                ("visit".to_string(), "3".to_string()),
                ("instrument".to_string(), "i03".to_string()),
                (
                    "members".to_string(),
                    serde_json::to_string(&vec![&"enu43627", &"iat69393", &"mrg27357"]).unwrap(),
                ),
                (
                    "member_refs".to_string(),
                    serde_json::to_string(&vec![
                        Subject {
                            kind: "User".to_string(),
                            name: "oidc:enu43627".to_string(),
                            ..Default::default()
                        },
                        Subject {
                            kind: "User".to_string(),
                            name: "oidc:iat69393".to_string(),
                            ..Default::default()
                        },
                        Subject {
                            kind: "User".to_string(),
                            name: "oidc:mrg27357".to_string(),
                            ..Default::default()
                        },
                    ])
                    .unwrap(),
                ),
                (
                    "start_date".to_string(),
                    datetime!(2024-05-24 09:00:00).to_string(),
                ),
                (
                    "end_date".to_string(),
                    datetime!(2024-08-09 09:00:00).to_string(),
                ),
            ])),
            ..Default::default()
        };
        let _mock = Mock::given(method("PATCH"))
            .and(path(
                "/api/v1/namespaces/cm37235-3/configmaps/sessionspaces",
            ))
            .and(query_param("fieldManager", "sessionspaces"))
            .and(body_partial_json(configmap.clone()))
            .respond_with(ResponseTemplate::new(201).set_body_json(configmap))
            .mount(&server)
            .await;
        let config = Config::new(server.uri().parse().unwrap());
        let k8s_client = Client::try_from(config).unwrap();
        create_configmap(
            "cm37235-3",
            Session {
                proposal_code: "cm".to_string(),
                proposal_number: 37235,
                visit: 3,
                instrument: Instrument::I03,
                members: BTreeSet::from([
                    "enu43627".to_string(),
                    "iat69393".to_string(),
                    "mrg27357".to_string(),
                ]),
                gid: Some(161025),
                start_date: datetime!(2024-05-24 09:00:00),
                end_date: datetime!(2024-08-09 09:00:00),
            },
            k8s_client,
        )
        .await
        .unwrap();
    }
}
