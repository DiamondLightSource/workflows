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
    template_ref: Option<String>,
}

/// A Trigger for creating automated workflows
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
#[graphql(name = "Trigger")]
struct TriggerGQL {
    /// The name of the Trigger
    name: Option<String>,
    /// The name of a ClusterTriggerTemplate that the Trigger is created from
    template_ref: Option<String>,
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
            spec: TriggerSpec {
                template_ref: Some(template_ref),
            },
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
        graphql::triggers::{TriggerMutation, TriggerQuery},
        validate_token::ValidatedAuthToken,
        KubernetesApiUrl,
    };

    use async_graphql::{EmptySubscription, PathSegment, Pos, Schema, ServerError};
    use axum_extra::headers::Authorization;
    use jsonwebtoken::{encode, EncodingKey, Header};
    use mockito::{Matcher, ServerGuard};
    use rstest::rstest;
    use serde::{Deserialize, Serialize};
    use serde_json::{json, Value};
    use std::path::PathBuf;

    #[derive(Debug, Serialize, Deserialize)]
    struct TestClaims {
        posix_uid: String,
    }

    fn test_token() -> ValidatedAuthToken {
        let claims = TestClaims {
            posix_uid: "7357".into(),
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(b"test-secret"),
        )
        .expect("failed to create jwt");

        let auth = Authorization::bearer(&token).unwrap();

        ValidatedAuthToken::Valid(auth)
    }

    fn asset(name: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("test-assets")
            .join(name)
    }

    struct TestContext {
        _kubeconfig: tempfile::NamedTempFile,
        server: ServerGuard,
        schema: Schema<TriggerQuery, TriggerMutation, EmptySubscription>,
    }

    impl TestContext {
        async fn new() -> anyhow::Result<Self> {
            let _ = rustls::crypto::ring::default_provider().install_default();

            let server = mockito::Server::new_async().await;

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

            let schema = Schema::build(TriggerQuery, TriggerMutation, EmptySubscription)
                .data(KubernetesApiUrl(server.url().parse()?))
                .data(test_token())
                .finish();

            Ok(Self {
                _kubeconfig: file,
                server,
                schema,
            })
        }
    }

    async fn execute(
        schema: &Schema<TriggerQuery, TriggerMutation, EmptySubscription>,
        query: impl Into<String>,
    ) -> anyhow::Result<Value> {
        Ok(schema.execute(query.into()).await.data.into_json()?)
    }

    async fn mock_create_trigger(
        server: &mut ServerGuard,
        namespace: &str,
        response_fixture: &str,
    ) -> mockito::Mock {
        server
            .mock(
                "POST",
                &format!("/apis/workflows.diamond.ac.uk/v1alpha1/namespaces/{namespace}/triggers?")
                    [..],
            )
            .match_body(Matcher::PartialJson(json!({
                "metadata": {
                    "labels": {
                        "workflows.diamond.ac.uk/posixuid": "7357"
                    }
                }
            })))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(asset(response_fixture))
            .create_async()
            .await
    }

    async fn mock_get_trigger(
        server: &mut ServerGuard,
        name: &str,
        response_fixture: &str,
    ) -> mockito::Mock {
        server
            .mock(
                "GET",
                &format!(
                    "/apis/workflows.diamond.ac.uk/v1alpha1/namespaces/events/triggers/{name}"
                )[..],
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(asset(response_fixture))
            .create_async()
            .await
    }

    async fn mock_list_triggers(server: &mut ServerGuard, response_fixture: &str) -> mockito::Mock {
        server
            .mock("GET", "/apis/workflows.diamond.ac.uk/v1alpha1/triggers")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(asset(response_fixture))
            .create_async()
            .await
    }

    #[rstest]
    #[case(
        r#"
        mutation {
            createTrigger(templateRef: "test-trigger") {
                name
            }
        }
        "#,
        "make-trigger.json",
        "events",
        json!({
            "createTrigger": {
                "name": "test-trigger-s6qzl"
            }
        })
    )]
    #[case(
        r#"
        mutation {
            createTrigger(
                templateRef: "test-trigger",
                name: "custom-name"
            ) {
                name
            }
        }
        "#,
        "named-trigger.json",
        "events",
        json!({
            "createTrigger": {
                "name": "custom-name"
            }
        })
    )]
    #[case(
        r#"
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
        "#,
        "namespaced-trigger.json",
        "mg36964-1",
        json!({
            "createTrigger": {
                "name": "test-trigger-s6qzl"
            }
        })
    )]
    #[tokio::test]
    async fn create_trigger_mutations(
        #[case] query: &str,
        #[case] fixture: &str,
        #[case] namespace: &str,
        #[case] expected: Value,
    ) -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;

        let mock = mock_create_trigger(&mut ctx.server, namespace, fixture).await;
        let actual = execute(&ctx.schema, query).await?;

        mock.assert_async().await;
        assert_eq!(actual, expected);
        Ok(())
    }

    #[tokio::test]
    async fn get_single_trigger() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;

        let mock = mock_get_trigger(
            &mut ctx.server,
            "example-trigger-mfvpj",
            "get-single-trigger.json",
        )
        .await;

        let actual = execute(
            &ctx.schema,
            r#"
            query {
                trigger(name: "example-trigger-mfvpj") {
                    name
                    beamline
                }
            }
            "#,
        )
        .await?;

        mock.assert_async().await;

        assert_eq!(
            actual,
            json!({
                "trigger": {
                    "name": "example-trigger-mfvpj",
                    "beamline": "test-beamline"
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn unauthorised_get_single_trigger() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;

        mock_get_trigger(
            &mut ctx.server,
            "example-trigger-mfvpj",
            "unauthorised-trigger.json",
        )
        .await;

        let response = ctx
            .schema
            .execute(
                r#"
                query {
                    trigger(name: "example-trigger-mfvpj") {
                        name
                        beamline
                    }
                }
                "#,
            )
            .await;

        let err = response.into_result().unwrap_err();
        let exp_err = ServerError {
            message: "Forbidden from accessing resource".into(),
            locations: vec![Pos {
                line: 3,
                column: 21,
            }],
            source: None,
            path: vec![PathSegment::Field("trigger".into())],
            extensions: None,
        };

        assert_eq!(err[0], exp_err);
        Ok(())
    }

    #[tokio::test]
    async fn get_many_triggers() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let mock = mock_list_triggers(&mut ctx.server, "get-many-triggers.json").await;
        let actual = execute(
            &ctx.schema,
            r#"
            query {
                triggers {
                    nodes {
                        name
                        beamline
                    }
                }
            }
            "#,
        )
        .await?;
        mock.assert_async().await;
        assert_eq!(actual, expected_triggers());
        Ok(())
    }

    fn expected_triggers() -> Value {
        json!({
            "triggers": {
                "nodes": [
                    {
                        "name": "example-trigger-bv597",
                        "beamline": "test-beamline"
                    },
                    {
                        "name": "example-trigger-cht7k",
                        "beamline": "test-beamline"
                    },
                    {
                        "name": "example-trigger-hc7fx",
                        "beamline": "test-beamline"
                    },
                    {
                        "name": "example-trigger-kpgsr",
                        "beamline": "test-beamline"
                    },
                    {
                        "name": "example-trigger-mfvpj",
                        "beamline": "test-beamline"
                    },
                    {
                        "name": "example-trigger-nr7l9",
                        "beamline": "test-beamline"
                    },
                    {
                        "name": "example-trigger-sccmt",
                        "beamline": "test-beamline"
                    },
                    {
                        "name": "example-trigger-vsm7t",
                        "beamline": "test-beamline"
                    }
                ]
            }
        })
    }
}
