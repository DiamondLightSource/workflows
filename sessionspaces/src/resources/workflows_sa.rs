use k8s_openapi::api::{
    core::v1::ServiceAccount,
    rbac::v1::{ClusterRole, PolicyRule, RoleBinding, RoleRef, Subject},
};
use kube::{
    api::{ObjectMeta, Patch, PatchParams},
    discovery::verbs::{CREATE, GET, LIST, PATCH, WATCH},
    Api,
};
use tracing::instrument;

/// The Recource name for the argo workflows ServiceAccount, Role & RoleBinding
const ARGO_WORKFLOWS: &str = "argo-workflows";

/// Creates or updates a ClusterRole for use by the argo-workflows ServiceAccounts
#[instrument(skip(k8s_client))]
pub async fn create_argo_workflows_role(k8s_client: kube::Client) -> Result<(), kube::Error> {
    let cluster_roles = Api::<ClusterRole>::all(k8s_client);
    cluster_roles
        .patch(
            ARGO_WORKFLOWS,
            &PatchParams {
                field_manager: Some("kubectl".to_string()),
                ..Default::default()
            },
            &Patch::Apply(&ClusterRole {
                metadata: ObjectMeta {
                    name: Some(ARGO_WORKFLOWS.to_string()),
                    ..Default::default()
                },
                rules: Some(vec![
                    PolicyRule {
                        api_groups: Some(vec!["".to_string()]),
                        resources: Some(vec!["pods".to_string()]),
                        verbs: vec![GET.to_string(), WATCH.to_string(), PATCH.to_string()],
                        ..Default::default()
                    },
                    PolicyRule {
                        api_groups: Some(vec!["".to_string()]),
                        resources: Some(vec!["pods/logs".to_string()]),
                        verbs: vec![GET.to_string(), WATCH.to_string()],
                        ..Default::default()
                    },
                    PolicyRule {
                        api_groups: Some(vec!["".to_string()]),
                        resources: Some(vec!["pods/exec".to_string()]),
                        verbs: vec![CREATE.to_string()],
                        ..Default::default()
                    },
                    PolicyRule {
                        api_groups: Some(vec!["argoproj.io".to_string()]),
                        resources: Some(vec!["workflowtaskresults".to_string()]),
                        verbs: vec![CREATE.to_string(), PATCH.to_string()],
                        ..Default::default()
                    },
                    PolicyRule {
                        api_groups: Some(vec!["argoproj.io".to_string()]),
                        resources: Some(vec![
                            "workflowtasksets".to_string(),
                            "workflowartifactgctasks".to_string(),
                        ]),
                        verbs: vec![LIST.to_string(), WATCH.to_string()],
                        ..Default::default()
                    },
                    PolicyRule {
                        api_groups: Some(vec!["argoproj.io".to_string()]),
                        resources: Some(vec![
                            "workflowtasksets/status".to_string(),
                            "workflowartifactgctasks/status".to_string(),
                        ]),
                        verbs: vec![PATCH.to_string()],
                        ..Default::default()
                    },
                ]),
                ..Default::default()
            }),
        )
        .await?;
    Ok(())
}

/// Creates the `argo-workflows` ServiceAccount and corresponding Role
#[instrument(skip(k8s_client))]
pub async fn create_argo_workflows_service_account(
    namespace: String,
    k8s_client: kube::Client,
) -> Result<(), kube::Error> {
    let service_accounts = Api::<ServiceAccount>::namespaced(k8s_client.clone(), &namespace);
    let role_bindings = Api::<RoleBinding>::namespaced(k8s_client, &namespace);
    service_accounts
        .patch(
            ARGO_WORKFLOWS,
            &PatchParams {
                field_manager: Some("kubectl".to_string()),
                ..Default::default()
            },
            &Patch::Apply(&ServiceAccount {
                metadata: ObjectMeta {
                    name: Some(ARGO_WORKFLOWS.to_string()),
                    namespace: Some(namespace.clone()),
                    ..Default::default()
                },
                ..Default::default()
            }),
        )
        .await?;
    role_bindings
        .patch(
            ARGO_WORKFLOWS,
            &PatchParams {
                field_manager: Some("kubectl".to_string()),
                ..Default::default()
            },
            &Patch::Apply(&RoleBinding {
                metadata: ObjectMeta {
                    name: Some(ARGO_WORKFLOWS.to_string()),
                    namespace: Some(namespace),
                    ..Default::default()
                },
                subjects: Some(vec![Subject {
                    kind: "ServiceAccount".to_string(),
                    name: ARGO_WORKFLOWS.to_string(),
                    ..Default::default()
                }]),
                role_ref: RoleRef {
                    kind: "ClusterRole".to_string(),
                    name: ARGO_WORKFLOWS.to_string(),
                    api_group: "rbac.authorization.k8s.io".to_string(),
                },
            }),
        )
        .await?;
    Ok(())
}
