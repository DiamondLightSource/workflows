use std::{collections::BTreeMap, ops::Deref};

use crate::{
    graphql::{auth_guard::AuthGuard, subscription::get_auth_token, VisitInput},
    KubernetesApiUrl,
};
use async_graphql::{
    connection::{Connection, CursorType, Edge, EmptyFields, OpaqueCursor},
    Context, Object, SimpleObject,
};
use jsonwebtoken::dangerous::insecure_decode;
use kube::{
    api::{ListParams, ObjectMeta, PostParams},
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
    #[error(r#"Unable to infer Kubernetes config"#)]
    ConfigInferError,
    #[error(r#"Unable to create Kubernetes config"#)]
    ClientCreationError,
    #[error(r#"Forbidden from accessing resource"#)]
    ForbiddenAccess,
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
    /// The beamline that the Trigger monitors
    beamline: Option<String>,
}

impl From<Trigger> for TriggerGQL {
    fn from(t: Trigger) -> Self {
        Self {
            name: t.metadata.name,
            template_ref: t.spec.template_ref,
            beamline: t
                .metadata
                .labels
                .as_ref()
                .and_then(|l| l.get("workflows.diamond.ac.uk/beamline").cloned()),
        }
    }
}

/// Infers the Kubernetes client
async fn setup_client(ctx: &Context<'_>) -> Result<Client, TriggerError> {
    let kubernetes_api_url = ctx.data_unchecked::<KubernetesApiUrl>();
    let mut config = Config::infer()
        .await
        .map_err(|_| TriggerError::ConfigInferError)?;
    config.cluster_url = kubernetes_api_url.deref().clone();
    Client::try_from(config).or(Err(TriggerError::ClientCreationError))
}

/// Decodes the JWT to obtain the user's posix uid
async fn get_posix_from_ctx(ctx: &Context<'_>) -> Result<String, TriggerError> {
    let auth_token = get_auth_token(ctx).map_err(|_| TriggerError::MissingToken)?;

    let claims = insecure_decode::<Value>(auth_token)
        .map_err(|_| TriggerError::TokenDecodeError)?
        .claims;

    claims["posix_uid"]
        .as_str()
        .map(str::to_owned)
        .ok_or(TriggerError::MissingPosixUid)
}

/// Queries related to [`Trigger`]s
#[derive(Debug, Clone, Default)]
pub struct TriggerQuery;

#[Object(guard = "AuthGuard")]
impl TriggerQuery {
    /// Get a specific Trigger by name and visit
    async fn trigger(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: Option<String>,
    ) -> anyhow::Result<Option<TriggerGQL>> {
        let client = setup_client(ctx).await?;
        let posix_uid = get_posix_from_ctx(ctx).await?;
        let api: Api<Trigger> = Api::namespaced(client, &visit.unwrap_or("events".to_string()));
        match api.get(&name).await {
            Ok(trigger) => {
                if trigger.clone().metadata.labels.is_some_and(|f| {
                    f.get("workflows.diamond.ac.uk/posixuid")
                        .is_some_and(|l| l == &posix_uid)
                }) {
                    Ok(Some(trigger.into()))
                } else {
                    Err(TriggerError::ForbiddenAccess.into())
                }
            }
            Err(err) => Err(err.into()),
        }
    }

    /// Get multiple Triggers across namespaces
    async fn triggers(
        &self,
        ctx: &Context<'_>,
        cursor: Option<String>,
        limit: Option<u32>,
    ) -> anyhow::Result<Connection<OpaqueCursor<String>, TriggerGQL, EmptyFields, EmptyFields>>
    {
        let client = setup_client(ctx).await?;
        let posix_uid = get_posix_from_ctx(ctx).await?;
        let api: Api<Trigger> = Api::all(client);

        let continue_token = cursor
            .as_ref()
            .map(|cursor| {
                OpaqueCursor::<String>::decode_cursor(cursor)
                    .map(|c| c.0)
                    .map_err(|_| anyhow::anyhow!("Cursor not valid"))
            })
            .transpose()?;

        let mut lp = ListParams::default()
            .labels(format!("workflows.diamond.ac.uk/posixuid={}", posix_uid).as_str())
            .limit(limit.unwrap_or(10));

        if let Some(token) = &continue_token {
            lp = lp.continue_token(token);
        }

        let triggers_response = api.list(&lp).await?;

        let triggers = triggers_response
            .items
            .into_iter()
            .map(TriggerGQL::from)
            .collect::<Vec<_>>();

        let next_continue_token = triggers_response.metadata.continue_;

        let mut connection =
            Connection::new(continue_token.is_some(), next_continue_token.is_some());

        connection.edges.extend(triggers.into_iter().map(|trigger| {
            Edge::new(
                OpaqueCursor(next_continue_token.clone().unwrap_or_default()),
                trigger,
            )
        }));

        Ok(connection)
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
        let client = setup_client(ctx).await?;
        let posix_uid = get_posix_from_ctx(ctx).await?;
        let namespace = visit.map_or(String::from("events"), |v| v.to_string());
        let api: Api<Trigger> = Api::namespaced(client, &namespace);
        let trigger = Trigger {
            metadata: ObjectMeta {
                generate_name: Some(format!("{}-", template_ref)),
                name,
                labels: Some(BTreeMap::from([(
                    String::from("workflows.diamond.ac.uk/posixuid"),
                    posix_uid,
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

    // #[tokio::test]
    // async fn get_single_trigger() -> anyhow::Result<()> {
    //     let _ = rustls::crypto::ring::default_provider().install_default();
    //     let mut server = mockito::Server::new_async().await;
    //     let kubeconfig = format!(
    //         r#"
    //         apiVersion: v1
    //         kind: Config
    //         clusters:
    //         - cluster:
    //             server: {}
    //           name: test
    //         contexts:
    //         - context:
    //             cluster: test
    //             user: test
    //           name: test
    //         current-context: test
    //         users:
    //         - name: test
    //           user: {{}}
    //         "#,
    //         server.url()
    //     );

    //     let file = tempfile::NamedTempFile::new()?;
    //     std::fs::write(file.path(), kubeconfig)?;
    //     std::env::set_var("KUBECONFIG", file.path());

    //     server.mock(method, path)
    // }
}
