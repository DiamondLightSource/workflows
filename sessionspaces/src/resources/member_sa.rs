use k8s_openapi::api::rbac::v1::{ClusterRole, PolicyRule};
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    discovery::verbs::{CREATE, GET, LIST, WATCH},
    Api,
};
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
