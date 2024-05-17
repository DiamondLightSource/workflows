use k8s_openapi::api::core::v1::Namespace;
use kube::Error as KubeError;
use kube::{
    api::{DeleteParams, ObjectMeta, PostParams},
    Api,
};
use tracing::{info, instrument};

/// Removes a Namespace from the cluster
#[instrument(skip(k8s_client))]
pub async fn delete_namespace(
    namespace: &str,
    k8s_client: kube::Client,
) -> Result<(), kube::Error> {
    let api = Api::<Namespace>::all(k8s_client);
    match api.get(namespace).await {
        Ok(_) => {
            api.delete(namespace, &DeleteParams::default()).await?;
            Ok(())
        }
        Err(KubeError::Api(api_err)) if api_err.code == 404 => {
            info!("Namespace {namespace} does not exist, skipping deletion");
            Ok(())
        }
        Err(e) => Err(e.into()),
    }
}

/// Creates a Namespace with the given name
#[instrument(skip(k8s_client))]
pub async fn create_namespace(
    namespace: String,
    k8s_client: kube::Client,
) -> Result<(), kube::Error> {
    let api = Api::<Namespace>::all(k8s_client.clone());
    match api.get(&namespace.clone()).await {
        Ok(_) => {
            info!("Namespace {namespace} already exists, skipping creation");
            Ok(())
        }
        Err(KubeError::Api(api_err)) if api_err.code == 404 => {
            api.create(
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
        Err(e) => Err(e.into()),
    }
}
