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

#[cfg(test)]
mod tests {
    use super::*;
    use kube::Client;
    use kube::Config;
    use mockito::Server;

    #[tokio::test]
    async fn test_create_namespace_existing() {
        // Create a mock server
        let mut server = Server::new_async().await;

        let m1 = server
            .mock("GET", "/api/v1/namespaces/test-namespace1")
            .with_status(200)
            .with_body(
                r#"{
                    "kind": "Namespace",
                    "apiVersion": "v1",
                    "metadata": {
                        "name": "test-namespace1"
                    }
                }"#,
            )
            .create();

        let m2 = server
            .mock("GET", "/api/v1/namespaces/test-namespace2")
            .with_status(200)
            .with_body(
                r#"{
                    "kind": "Namespace",
                    "apiVersion": "v1",
                    "metadata": {
                        "name": "test-namespace2"
                    }
                }"#,
            )
            .create();

        let config = Config::new(server.url().parse().unwrap());
        let k8s_client = Client::try_from(config).unwrap();

        assert!(
            create_namespace("test-namespace1".to_string(), k8s_client.clone())
                .await
                .is_ok()
        );
        assert!(create_namespace("test-namespace2".to_string(), k8s_client)
            .await
            .is_ok());

        // Verify expectations
        m1.assert();
        m2.assert();
    }

    #[tokio::test]
    async fn test_create_namespace() {
        // Create a mock server
        let mut server = Server::new_async().await;

        let m1 = server
            .mock("POST", "/api/v1/namespaces?")
            .with_status(201)
            .with_header("content-type", "application/json")
            .with_body(
                r#"{
                    "kind": "Namespace",
                    "apiVersion": "v1",
                    "metadata": {
                        "name": "new-namespace"
                    }
                }"#,
            )
            .create();

        let m2 = server
            .mock("GET", "/api/v1/namespaces/testing-namespace3")
            .with_status(404)
            .create();

        let config = Config::new(server.url().parse().unwrap());
        let k8s_client = Client::try_from(config).unwrap();
        assert!(
            create_namespace("testing-namespace3".to_string(), k8s_client)
                .await
                .is_ok()
        );

        // Verify if the request hits the mock endpoints
        m1.assert();
        m2.assert();
    }
}
