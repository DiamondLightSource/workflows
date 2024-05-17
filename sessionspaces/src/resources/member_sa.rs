use itertools::Itertools;
use k8s_openapi::api::{
    core::v1::ServiceAccount,
    rbac::v1::{ClusterRole, PolicyRule, RoleBinding, RoleRef, Subject},
};
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    discovery::verbs::{CREATE, GET, LIST, WATCH},
    Api,
};
use std::collections::BTreeMap;
use tracing::instrument;

/// The Resource name for the visit member ServiceAccount, Role & RoleBinding
const VISIT_MEMBER: &str = "visit-member";

/// Creates or updates a ClusterRole for use by the argo-workflows ServiceAccounts
#[instrument(skip(k8s_client))]
pub async fn create_visit_member_role(k8s_client: kube::Client) -> Result<(), kube::Error> {
    let cluster_roles = Api::<ClusterRole>::all(k8s_client);
    cluster_roles
        .patch(
            VISIT_MEMBER,
            &PatchParams {
                field_manager: Some("kubectl".to_string()),
                ..Default::default()
            },
            &Patch::Apply(&ClusterRole {
                metadata: ObjectMeta {
                    name: Some(VISIT_MEMBER.to_string()),
                    ..Default::default()
                },
                rules: Some(vec![
                    PolicyRule {
                        api_groups: Some(vec!["argoproj.io".to_string()]),
                        resources: Some(vec![
                            "eventsources".to_string(),
                            "sensors".to_string(),
                            "workflows".to_string(),
                            "workfloweventbindings".to_string(),
                            "workflowtemplates".to_string(),
                            "clusterworkflowtemplates".to_string(),
                            "cronworkflows".to_string(),
                            "workflowtaskresults".to_string(),
                        ]),
                        verbs: vec![GET.to_string(), LIST.to_string(), WATCH.to_string()],
                        ..Default::default()
                    },
                    PolicyRule {
                        api_groups: Some(vec!["argoproj.io".to_string()]),
                        resources: Some(vec!["workflows".to_string()]),
                        verbs: vec![CREATE.to_string()],
                        ..Default::default()
                    },
                ]),
                ..Default::default()
            }),
        )
        .await?;
    Ok(())
}

/// Creates the `visit-member` ServiceAccount and corresponding Role
#[instrument(skip(members, k8s_client), err(level=tracing::Level::WARN))]
pub async fn create_visit_member_service_account(
    namespace: String,
    members: impl IntoIterator<Item = impl AsRef<str>>,
    k8s_client: kube::Client,
) -> Result<(), kube::Error> {
    let service_accounts = Api::<ServiceAccount>::namespaced(k8s_client.clone(), &namespace);
    let role_bindings = Api::<RoleBinding>::namespaced(k8s_client, &namespace);

    #[allow(unstable_name_collisions)]
    let rbac_rule = format!(
        "'sub' in [{}]",
        members
            .into_iter()
            .map(|member| format!(r#""{}""#, member.as_ref()))
            .intersperse(", ".to_string())
            .collect::<String>()
    );
    let service_account_annotations = BTreeMap::from([
        (
            "workflows.argoproj.io/rbac-rule-precedence".to_string(),
            "1".to_string(),
        ),
        ("workflows.argoproj.io/rbac-rule".to_string(), rbac_rule),
    ]);

    service_accounts
        .patch(
            VISIT_MEMBER,
            &PatchParams {
                field_manager: Some("kubectl".to_string()),
                ..Default::default()
            },
            &Patch::Apply(&ServiceAccount {
                metadata: ObjectMeta {
                    name: Some(VISIT_MEMBER.to_string()),
                    namespace: Some(namespace.clone()),
                    annotations: Some(service_account_annotations),
                    ..Default::default()
                },
                ..Default::default()
            }),
        )
        .await?;
    role_bindings
        .patch(
            VISIT_MEMBER,
            &PatchParams {
                field_manager: Some("kubectl".to_string()),
                ..Default::default()
            },
            &Patch::Apply(&RoleBinding {
                metadata: ObjectMeta {
                    name: Some(VISIT_MEMBER.to_string()),
                    namespace: Some(namespace),
                    ..Default::default()
                },
                subjects: Some(vec![Subject {
                    kind: "ServiceAccount".to_string(),
                    name: VISIT_MEMBER.to_string(),
                    ..Default::default()
                }]),
                role_ref: RoleRef {
                    kind: "ClusterRole".to_string(),
                    name: VISIT_MEMBER.to_string(),
                    api_group: "rbac.authorization.k8s.io".to_string(),
                },
            }),
        )
        .await?;
    Ok(())
}
