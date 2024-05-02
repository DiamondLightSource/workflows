use k8s_openapi::api::core::v1::Namespace;
use kube::{
    api::{DeleteParams, ObjectMeta, PostParams},
    Api,
};
use tracing::instrument;

/// Removes a Namespace from the cluster
#[instrument(skip(k8s_client))]
pub async fn delete_namespace(
    namespace: &str,
    k8s_client: kube::Client,
) -> Result<(), kube::Error> {
    let namespaces = Api::<Namespace>::all(k8s_client);
    namespaces
        .delete(namespace, &DeleteParams::default())
        .await?;
    Ok(())
}

/// Creates a Namespace with the given name
#[instrument(skip(k8s_client))]
pub async fn create_namespace(
    namespace: String,
    k8s_client: kube::Client,
) -> Result<(), kube::Error> {
    let namespaces = Api::<Namespace>::all(k8s_client.clone());
    namespaces
        .create(
            &PostParams::default(),
            &Namespace {
                metadata: ObjectMeta {
                    name: Some(namespace.clone()),
                    ..Default::default()
                },
                ..Default::default()
            },
        )
        .await?;
    Ok(())
}
