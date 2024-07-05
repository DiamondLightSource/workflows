use super::{MANAGED_BY, MANAGED_BY_LABEL};
use k8s_openapi::api::core::v1::Namespace;
use kube::api::{Patch, PatchParams};
use kube::Error as KubeError;
use kube::{
    api::{DeleteParams, ObjectMeta},
    Api,
};
use std::collections::BTreeMap;
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
        Err(e) => Err(e),
    }
}

/// Creates a Namespace with the given name
#[instrument(skip(k8s_client))]
pub async fn create_namespace(
    namespace: String,
    k8s_client: kube::Client,
) -> Result<(), kube::Error> {
    let api = Api::<Namespace>::all(k8s_client.clone());
    api.patch(
        &namespace,
        &PatchParams::default(),
        &Patch::Apply(&Namespace {
            metadata: ObjectMeta {
                name: Some(namespace.clone()),
                labels: Some(BTreeMap::from([(
                    MANAGED_BY_LABEL.to_string(),
                    MANAGED_BY.to_string(),
                )])),
                ..Default::default()
            },
            ..Default::default()
        }),
    )
    .await?;
    info!("Namespace {namespace} created / updated");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use kube::Client;
    use kube::Config;
    use mockito::Server;

    #[tokio::test]
    async fn create_new_namespace() {
        let mut server = Server::new_async().await;
        let mock_patch_test_namespace = server
            .mock("PATCH", "/api/v1/namespaces/test?")
            .with_status(201)
            .with_header("content-type", "application/json")
            .with_body(
                r#"{
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {
                        "name": "test"
                    }
                }"#,
            )
            .create();
        let config = Config::new(server.url().parse().unwrap());
        let k8s_client = Client::try_from(config).unwrap();
        create_namespace("test".to_string(), k8s_client)
            .await
            .unwrap();
        mock_patch_test_namespace.assert();
    }
}
