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
        &PatchParams {
            field_manager: Some("sessionspaces".to_string()),
            ..Default::default()
        },
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
    use super::create_namespace;
    use k8s_openapi::api::core::v1::Namespace;
    use kube::{api::ObjectMeta, Client, Config};
    use wiremock::{
        matchers::{body_partial_json, method, path, query_param},
        Mock, MockServer, ResponseTemplate,
    };

    #[tokio::test]
    async fn create_new_namespace() {
        let server = MockServer::start().await;
        let namespace = Namespace {
            metadata: ObjectMeta {
                name: Some("cm37235-3".to_string()),
                ..Default::default()
            },
            ..Default::default()
        };
        let _mock = Mock::given(method("PATCH"))
            .and(path("/api/v1/namespaces/cm37235-3"))
            .and(query_param("fieldManager", "sessionspaces"))
            .and(body_partial_json(namespace.clone()))
            .respond_with(ResponseTemplate::new(201).set_body_json(namespace))
            .expect(1)
            .mount(&server)
            .await;
        let config = Config::new(server.uri().parse().unwrap());
        let k8s_client = Client::try_from(config).unwrap();
        create_namespace("cm37235-3".to_string(), k8s_client)
            .await
            .unwrap();
    }
}
