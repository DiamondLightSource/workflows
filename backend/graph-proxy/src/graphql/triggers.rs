use std::{collections::BTreeMap, ops::Deref};

use crate::{
    graphql::{auth_guard::AuthGuard, subscription::get_auth_token, VisitInput},
    KubernetesApiUrl,
};
use async_graphql::{Context, Object, SimpleObject};
use jsonwebtoken::dangerous::insecure_decode;
use kube::{
    api::{ObjectMeta, PostParams},
    Api, Client, Config, CustomResource,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// An error relating to a workflow Trigger
#[derive(Debug, thiserror::Error)]
#[allow(clippy::missing_docs_in_private_items)]
enum TriggerError {
    #[error(r#"Unable to decode JWT"#)]
    TokenDecodeError,
    #[error(r#"Posix UID missing from token claims"#)]
    MissingPosixUid,
    #[error(r#"Token not found"#)]
    MissingToken,
}

/// The contents of the `spec` field of the Trigger custom resource. Used to generate the Trigger root object
#[derive(CustomResource, Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[kube(
    group = "workflows.diamond.ac.uk",
    version = "v1alpha1",
    kind = "Trigger",
    namespaced
)]
struct TriggerSpec {
    /// The name of a ClusterTriggerTemplate that the Trigger is created from
    #[serde(rename = "templateRef")]
    template_ref: String,
}

/// A Trigger for creating automated workflows
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
#[graphql(name = "Trigger")]
struct TriggerGQL {
    /// The name of the Trigger
    name: Option<String>,
    /// The name of a ClusterTriggerTemplate that the Trigger is created from
    template_ref: String,
}

impl From<Trigger> for TriggerGQL {
    fn from(t: Trigger) -> Self {
        Self {
            name: t.metadata.name,
            template_ref: t.spec.template_ref,
        }
    }
}

/// Mutations related to [`Trigger`]s
#[derive(Debug, Clone, Default)]
pub struct TriggerMutation;

#[Object(guard = "AuthGuard")]
impl TriggerMutation {
    /// Create a Trigger from a template
    async fn create_trigger(
        &self,
        ctx: &Context<'_>,
        template_ref: String,
        name: Option<String>,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>> {
        let kubernetes_api_url = ctx.data_unchecked::<KubernetesApiUrl>();
        let auth_token: String = get_auth_token(ctx).map_err(|_| TriggerError::MissingToken)?;
        let claims = insecure_decode::<Value>(auth_token)
            .map_err(|_| TriggerError::TokenDecodeError)?
            .claims;
        let posix_uid = claims["posix_uid"]
            .as_str()
            .ok_or(TriggerError::MissingPosixUid)?;
        let mut config = Config::infer().await?;
        config.cluster_url = kubernetes_api_url.deref().clone();
        let client = Client::try_from(config)?;
        let namespace = visit.map_or(String::from("events"), |v| v.to_string());
        let api: Api<Trigger> = Api::namespaced(client.clone(), &namespace);
        let trigger = Trigger {
            metadata: ObjectMeta {
                generate_name: Some(format!("{}-", &template_ref)),
                name,
                labels: Some(BTreeMap::from([(
                    String::from("workflows.diamond.ac.uk/posixuid"),
                    String::from(posix_uid),
                )])),
                ..Default::default()
            },
            spec: TriggerSpec { template_ref },
        };

        match api.create(&PostParams::default(), &trigger).await {
            Ok(creation) => Ok(Some(creation.into())),
            Err(err) => Err(err.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        graphql::{triggers::TriggerMutation, workflow_templates::WorkflowTemplatesQuery},
        validate_token::ValidatedAuthToken,
        KubernetesApiUrl,
    };
    use async_graphql::{EmptySubscription, Schema};
    use axum_extra::headers::Authorization;
    use serde_json::Value;

    use jsonwebtoken::{encode, EncodingKey, Header};
    use mockito::Matcher;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    struct TestClaims {
        posix_uid: String,
    }

    fn test_token() -> ValidatedAuthToken {
        let claims = TestClaims {
            posix_uid: "7357".to_string(),
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(b"test-secret"),
        )
        .expect("failed to create test jwt");

        let auth = Authorization::bearer(&token).expect("token always valid");
        ValidatedAuthToken::Valid(auth)
    }

    async fn trigger_mutation(
        query: &str,
        mock_file: &str,
        namespace: &str,
        expected: Value,
    ) -> anyhow::Result<()> {
        let _ = rustls::crypto::ring::default_provider().install_default();
        let mut server = mockito::Server::new_async().await;
        let kubeconfig = format!(
            r#"
            apiVersion: v1
            kind: Config
            clusters:
            - cluster:
                server: {}
              name: test
            contexts:
            - context:
                cluster: test
                user: test
              name: test
            current-context: test
            users:
            - name: test
              user: {{}}
            "#,
            server.url()
        );

        let file = tempfile::NamedTempFile::new()?;
        std::fs::write(file.path(), kubeconfig)?;

        std::env::set_var("KUBECONFIG", file.path());
        let mut response_file_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        response_file_path.push("test-assets");
        response_file_path.push(mock_file);
        let trigger_endpoint = server
            .mock(
                "POST",
                &format!("/apis/workflows.diamond.ac.uk/v1alpha1/namespaces/{namespace}/triggers?")
                    [..],
            )
            .match_body(Matcher::PartialJson(serde_json::json!({
                "metadata": {
                    "labels": {
                        "workflows.diamond.ac.uk/posixuid": "7357"
                    }
                }
            })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;
        let kubernetes_server_url = server.url().parse()?;
        let schema = Schema::build(WorkflowTemplatesQuery, TriggerMutation, EmptySubscription)
            .data(KubernetesApiUrl(kubernetes_server_url))
            .data(test_token())
            .finish();
        let response = schema.execute(query).await;

        println!("Errors: {:#?}", response.errors);
        trigger_endpoint.assert_async().await;
        let actual = response.data.into_json().unwrap();
        assert_eq!(expected, actual);
        Ok(())
    }

    #[tokio::test]
    async fn simple_trigger_mutation() -> anyhow::Result<()> {
        let query = r#"
                mutation {
                    createTrigger(templateRef: "test-trigger") {
                        name
                    }
                }
                "#;
        let expected = serde_json::json!(
            {
                "createTrigger": {
                    "name": "test-trigger-s6qzl"
                }
            }
        );
        trigger_mutation(query, "make-trigger.json", "events", expected).await
    }

    #[tokio::test]
    async fn named_trigger_mutation() -> anyhow::Result<()> {
        let query = r#"
                mutation {
                    createTrigger(templateRef: "test-trigger", name: "custom-name") {
                        name
                    }
                }
                "#;
        let expected = serde_json::json!(
            {
                "createTrigger": {
                    "name": "custom-name"
                }
            }
        );
        trigger_mutation(query, "named-trigger.json", "events", expected).await
    }

    #[tokio::test]
    async fn namespaced_trigger_mutation() -> anyhow::Result<()> {
        let query = r#"
                mutation {
                    createTrigger(
                        templateRef: "test-trigger", 
                        visit: {
                            proposalCode: "mg",
                            proposalNumber: 36964,
                            number: 1
                        }
                    ) {
                        name
                    }
                }
                "#;
        let expected = serde_json::json!(
            {
                "createTrigger": {
                    "name": "test-trigger-s6qzl"
                }
            }
        );
        trigger_mutation(query, "namespaced-trigger.json", "mg36964-1", expected).await
    }
}
