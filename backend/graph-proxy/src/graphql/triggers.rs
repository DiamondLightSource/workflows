use std::{collections::BTreeMap, ops::Deref, str::FromStr};

use crate::{
    graphql::{
        auth_guard::AuthGuard,
        subscription::get_auth_token,
        types::{SortOrder, StringFilterInputV2},
        VisitInput,
    },
    KubernetesApiUrl,
};
use async_graphql::{
    connection::{Connection, CursorType, Edge, EmptyFields, OpaqueCursor},
    Context, Enum, InputObject, Object, SimpleObject,
};
use chrono::{DateTime, Utc};
use jsonwebtoken::dangerous::insecure_decode;
use kube::{
    api::{DeleteParams, ListParams, ObjectMeta, Patch, PatchParams, PostParams},
    core::duration::Duration,
    Api, Client, Config, CustomResource,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time;

/// An error relating to a workflow Trigger
#[derive(Debug, thiserror::Error)]
#[allow(clippy::missing_docs_in_private_items)]
enum TriggerError {
    #[error(r#"Unable to decode JWT"#)]
    TokenDecodeError,
    #[error(r#"Posix UID missing from token claims"#)]
    MissingPosixUid,
    #[error(r#"Missing subject in token"#)]
    MissingSub,
    #[error(r#"Token not found"#)]
    MissingToken,
    #[error(r#"Unable to infer Kubernetes config"#)]
    ConfigInferError,
    #[error(r#"Unable to create Kubernetes config"#)]
    ClientCreationError,
    #[error(r#"Permission denied: You may only access your own triggers"#)]
    ForbiddenAccess,
    #[error(r#"Unable to find trigger {0}"#)]
    TriggerNotFound(String),
}

/// Information that uniquely identifies a single trigger
#[derive(Debug, InputObject)]
struct WorkflowTriggerReferenceInput {
    /// The name of the trigger
    name: String,
    /// The session the trigger belongs to
    session: Option<VisitInput>,
}

/// Filters for the workflowTriggers query
#[expect(unused)]
#[derive(Debug, InputObject)]
struct WorkflowTriggerFilterInput {
    /// The session a trigger is attached to
    session: VisitInput,
    /// The name of the trigger
    name: StringFilterInputV2,
    /// The template from which the trigger was created
    template_ref: StringFilterInputV2,
    /// The beamline a trigger belongs to
    beamline: StringFilterInputV2,
    /// Whether a trigger is currently active or not
    is_enabled: bool,
    /// The account that created the trigger
    creator_id: StringFilterInputV2,
}

/// Sort fields for triggers
#[derive(Debug, Enum, Copy, Clone, Eq, PartialEq)]
enum WorkflowTriggerSortField {
    /// The name of the trigger
    Name,
    /// The beamline the trigger belongs to
    Beamline,
    /// The template from which the trigger was created
    TemplateRef,
}

/// Configuration for displaying sorted triggers
#[expect(unused)]
#[derive(Debug, InputObject)]
struct WorkflowTriggerOrderInput {
    /// The metadata field that should be used to order the triggers
    field: WorkflowTriggerSortField,
    /// The direction (ascending or descending) to display results
    direction: SortOrder,
}

/// Information about the creator of a Trigger.
#[derive(Debug, Clone, SimpleObject, Eq, PartialEq, Serialize, Deserialize)]
struct WorkflowTriggerCreator {
    /// An identifier unique to the creator of the Trigger.
    /// Typically this is the creator's Fed-ID.
    creator_id: String,
}
impl WorkflowTriggerCreator {
    /// Creates a new [`WorkflowTriggerCreator`] from the given creator ID.
    fn new(creator_id: impl Into<String>) -> Self {
        Self {
            creator_id: creator_id.into(),
        }
    }

    /// Builds a [`WorkflowTriggerCreator`] from Trigger labels.
    fn from_trigger_labels(labels: &Option<BTreeMap<String, String>>) -> Self {
        let creator_id = match labels {
            Some(l) => l
                .get("workflows.diamond.ac.uk/creator-preferred-username")
                .or_else(|| l.get("workflows.diamond.ac.uk/creator-fedid"))
                .cloned()
                .unwrap_or("Unknown".into()),
            None => "Unknown".into(),
        };
        Self::new(creator_id)
    }
}

/// Information about the creator of a Trigger
#[derive(Debug, Clone, SimpleObject, Eq, PartialEq, Serialize, Deserialize)]
struct TriggerCreator {
    /// An identifier unique to the creator of the Trigger.
    /// Typically this is the creator's Fed-ID.
    creator_id: String,
}

impl TriggerCreator {
    /// Creates a new [`TriggerCreator`] from the given creator ID.
    fn new(creator_id: impl Into<String>) -> Self {
        Self {
            creator_id: creator_id.into(),
        }
    }

    /// Builds a [`TriggerCreator`] from Trigger labels.
    fn from_trigger_labels(labels: &Option<BTreeMap<String, String>>) -> Self {
        let creator_id = match labels {
            Some(l) => l
                .get("workflows.diamond.ac.uk/creator-preferred-username")
                .or_else(|| l.get("workflows.diamond.ac.uk/creator-fedid"))
                .cloned()
                .unwrap_or("Unknown".into()),
            None => "Unknown".into(),
        };
        Self::new(creator_id)
    }
}

impl From<WorkflowTriggerCreator> for TriggerCreator {
    fn from(wtc: WorkflowTriggerCreator) -> Self {
        Self {
            creator_id: wtc.creator_id,
        }
    }
}

/// The contents of the `workflow` field in the `spec` field in the Trigger custom resource
#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
struct TriggerWorkflow {
    /// The name of the template that the workflow is based on
    template: String,
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
    /// Whether the Trigger is currently active or not
    enabled: bool,
    /// How long (from creation) should the trigger exist for before being cleaned up
    lifetime: Option<String>,
    /// The workflow that is run when the trigger is activated
    workflow: Option<TriggerWorkflow>,
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
    /// The visit that the Trigger is tied to
    visit: String,
    /// Whether the Trigger is currently active or not
    enabled: bool,
    /// Information about the creator of the Trigger
    creator: TriggerCreator,
    /// The datetime at which a trigger will be automatically deleted (None means it will not)
    expiry: Option<DateTime<Utc>>,
    /// The workflow template(s) used when the trigger is activated
    workflow_template_name: Vec<String>,
}

impl From<Trigger> for TriggerGQL {
    fn from(t: Trigger) -> Self {
        let visit = match t.metadata.namespace {
            Some(ref namespace) => {
                if namespace.as_str() == "events" {
                    String::from("any")
                } else {
                    namespace.clone()
                }
            }
            None => String::from("Unknown"),
        };
        let expiry = calculate_expiry(&t);
        Self {
            name: t.metadata.name,
            template_ref: t.spec.template_ref,
            beamline: t
                .metadata
                .labels
                .as_ref()
                .and_then(|l| l.get("workflows.diamond.ac.uk/beamline").cloned()),
            visit,
            enabled: t.spec.enabled,
            creator: TriggerCreator::from_trigger_labels(&t.metadata.labels),
            expiry,
            workflow_template_name: match t.spec.workflow {
                Some(workflow) => {
                    vec![workflow.template]
                }
                None => {
                    vec![]
                }
            },
        }
    }
}
/// Converts the new WorkflowTrigger type into the deprecated TriggerGQL for backwards compatibility
impl From<WorkflowTrigger> for TriggerGQL {
    fn from(t: WorkflowTrigger) -> Self {
        Self {
            name: t.name,
            template_ref: t.template_ref,
            beamline: t.beamline,
            visit: t.session,
            enabled: t.enabled,
            creator: t.creator.into(),
            expiry: t.expiry,
            workflow_template_name: t.workflow_template_name,
        }
    }
}
impl From<Trigger> for WorkflowTrigger {
    fn from(t: Trigger) -> Self {
        let session = match t.metadata.namespace {
            Some(ref namespace) => {
                if namespace.as_str() == "events" {
                    String::from("any")
                } else {
                    namespace.clone()
                }
            }
            None => String::from("Unknown"),
        };
        let expiry = calculate_expiry(&t);
        Self {
            name: t.metadata.name,
            template_ref: t.spec.template_ref,
            beamline: t
                .metadata
                .labels
                .as_ref()
                .and_then(|l| l.get("workflows.diamond.ac.uk/beamline").cloned()),
            session,
            enabled: t.spec.enabled,
            creator: WorkflowTriggerCreator::from_trigger_labels(&t.metadata.labels),
            expiry,
            workflow_template_name: match t.spec.workflow {
                Some(workflow) => {
                    vec![workflow.template]
                }
                None => {
                    vec![]
                }
            },
        }
    }
}

/// A Trigger for creating automated workflows
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
struct WorkflowTrigger {
    /// The name of the Trigger
    name: Option<String>,
    /// The name of a ClusterTriggerTemplate that the Trigger is created from
    template_ref: Option<String>,
    /// The beamline that the Trigger monitors
    beamline: Option<String>,
    /// The session that the Trigger is tied to
    session: String,
    /// Whether the Trigger is currently active or not
    enabled: bool,
    /// Information about the creator of the Trigger
    creator: WorkflowTriggerCreator,
    /// The datetime at which a trigger will be automatically deleted (None means it will not)
    expiry: Option<DateTime<Utc>>,
    /// The workflow template(s) used when the trigger is activated
    workflow_template_name: Vec<String>,
}

/// Calculates the expiry time (point where a trigger will automatically be deleted)
fn calculate_expiry(trigger_object: &Trigger) -> Option<DateTime<Utc>> {
    let lifetime = trigger_object.spec.lifetime.as_ref()?;
    if lifetime == "forever" {
        return Option::<DateTime<Utc>>::None;
    }
    match &trigger_object.metadata.creation_timestamp {
        Some(time) => {
            let creation_time_in_seconds = time.0.as_second();
            let Ok(lifetime) = Duration::from_str(lifetime) else {
                return Option::<DateTime<Utc>>::None;
            };
            let lifetime_seconds = time::Duration::from(lifetime).as_secs() as i64;
            DateTime::from_timestamp_secs(creation_time_in_seconds + lifetime_seconds)
        }
        None => Option::<DateTime<Utc>>::None,
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

/// Claims in a user's keycloak token
struct UserClaims {
    /// A user's POSIX uid
    posix_uid: String,
    /// A user's preferred username (often equivalent to Fed-ID)
    preferred_username: Option<String>,
    /// A user's Fed-ID
    fedid: Option<String>,
    /// The subject of the JWT (the user)
    sub: String,
}

/// Decodes the JWT to obtain the user's posix uid
async fn get_posix_from_ctx(ctx: &Context<'_>) -> Result<UserClaims, TriggerError> {
    let auth_token = get_auth_token(ctx).map_err(|_| TriggerError::MissingToken)?;

    let claims = insecure_decode::<Value>(auth_token)
        .map_err(|_| TriggerError::TokenDecodeError)?
        .claims;

    let posix_uid = claims["posix_uid"]
        .as_str()
        .map(str::to_owned)
        .ok_or(TriggerError::MissingPosixUid)?;

    let preferred_username = claims["preferred_username"].as_str().map(str::to_owned);

    let fedid = claims["fedid"].as_str().map(str::to_owned);
    let sub = claims["sub"]
        .as_str()
        .map(str::to_owned)
        .ok_or(TriggerError::MissingSub)?;

    Ok(UserClaims {
        posix_uid,
        preferred_username,
        fedid,
        sub,
    })
}

/// Uses the provided API to retrieve a Trigger, if the posix uid argument matches the label on the Trigger
async fn get_trigger_with_matching_posix(
    api: &Api<Trigger>,
    posix_uid: &str,
    name: &str,
) -> anyhow::Result<Option<WorkflowTrigger>> {
    match api.get(name).await {
        Ok(trigger) => {
            if trigger.clone().metadata.labels.is_some_and(|f| {
                f.get("workflows.diamond.ac.uk/posixuid")
                    .is_some_and(|l| l == posix_uid)
            }) {
                Ok(Some(trigger.into()))
            } else {
                Err(TriggerError::ForbiddenAccess.into())
            }
        }
        Err(err) => Err(err.into()),
    }
}

/// Uses the provided API to retrieve a Trigger without checking the posix uid
async fn get_trigger(api: &Api<Trigger>, name: &str) -> anyhow::Result<Option<WorkflowTrigger>> {
    api.get(name)
        .await
        .map_or_else(|err| Err(err.into()), |t| Ok(Some(t.into())))
}

/// Sets the value of the `enabled` field of a Trigger to the supplied value
async fn toggle_trigger(
    api: &Api<Trigger>,
    name: &str,
    enabled: bool,
) -> anyhow::Result<Option<TriggerGQL>> {
    let patch = serde_json::json!({
        "spec": {
            "enabled": enabled
        }
    });
    let patch = Patch::Merge(&patch);
    let pp = PatchParams::apply("graph-proxy");
    let trigger_patched = api.patch(name, &pp, &patch).await?;
    Ok(Some(trigger_patched.into()))
}

/// Queries related to [`Trigger`]s
#[derive(Debug, Clone, Default)]
pub struct TriggerQuery;

#[Object(guard = "AuthGuard")]
impl TriggerQuery {
    #[graphql(deprecation = "Use workflowTrigger instead")]
    /// Get a specific Trigger by name and visit (DEPRECATED)
    async fn trigger(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>> {
        let reference = WorkflowTriggerReferenceInput {
            name,
            session: visit,
        };
        self.workflow_trigger(ctx, reference)
            .await
            .map(|f| f.map(TriggerGQL::from))
    }

    #[graphql(deprecation = "Use workflowTriggers instead")]
    /// Get multiple Triggers across namespaces (DEPRECATED)
    async fn triggers(
        &self,
        ctx: &Context<'_>,
        cursor: Option<String>,
        limit: Option<u32>,
    ) -> anyhow::Result<Connection<OpaqueCursor<String>, TriggerGQL, EmptyFields, EmptyFields>>
    {
        let client = setup_client(ctx).await?;
        let api: Api<Trigger> = Api::all(client);

        let continue_token = cursor
            .as_ref()
            .map(|cursor| {
                OpaqueCursor::<String>::decode_cursor(cursor)
                    .map(|c| c.0)
                    .map_err(|_| anyhow::anyhow!("Cursor not valid"))
            })
            .transpose()?;

        let mut lp = ListParams::default().limit(limit.unwrap_or(10));

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

    /// Get a specific Trigger by name and session
    async fn workflow_trigger(
        &self,
        ctx: &Context<'_>,
        reference: WorkflowTriggerReferenceInput,
    ) -> anyhow::Result<Option<WorkflowTrigger>> {
        let client = setup_client(ctx).await?;
        let namespace = reference
            .session
            .map_or(String::from("events"), |v| v.to_string());
        let api: Api<Trigger> = Api::namespaced(client, &namespace);
        get_trigger(&api, &reference.name).await
    }

    /// Get multiple Triggers across sessions
    async fn workflow_triggers(
        &self,
        ctx: &Context<'_>,
        cursor: Option<String>,
        limit: Option<u32>,
        // filter: Option<WorkflowTriggerFilterInput>,
        // order_by: Option<Vec<WorkflowTriggerOrderInput>>,
    ) -> anyhow::Result<Connection<OpaqueCursor<String>, WorkflowTrigger, EmptyFields, EmptyFields>>
    {
        let client = setup_client(ctx).await?;
        let api: Api<Trigger> = Api::all(client);

        let continue_token = cursor
            .as_ref()
            .map(|cursor| {
                OpaqueCursor::<String>::decode_cursor(cursor)
                    .map(|c| c.0)
                    .map_err(|_| anyhow::anyhow!("Cursor not valid"))
            })
            .transpose()?;

        let mut lp = ListParams::default().limit(limit.unwrap_or(10));

        if let Some(token) = &continue_token {
            lp = lp.continue_token(token);
        }

        let triggers_response = api.list(&lp).await?;

        let triggers = triggers_response
            .items
            .into_iter()
            .map(WorkflowTrigger::from)
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
        let UserClaims {
            posix_uid,
            preferred_username,
            fedid,
            sub,
        } = get_posix_from_ctx(ctx).await?;
        let namespace = visit.map_or(String::from("events"), |v| v.to_string());
        let api: Api<Trigger> = Api::namespaced(client, &namespace);
        let mut labels = BTreeMap::from([
            (String::from("workflows.diamond.ac.uk/posixuid"), posix_uid),
            (String::from("workflows.diamond.ac.uk/creator"), sub),
        ]);
        preferred_username.map(|p| {
            labels.insert(
                String::from("workflows.diamond.ac.uk/creator-preferred-username"),
                p,
            )
        });
        fedid.map(|f| labels.insert(String::from("workflows.diamond.ac.uk/creator-fedid"), f));
        let trigger = Trigger {
            metadata: ObjectMeta {
                generate_name: Some(format!("{}-", template_ref)),
                name,
                labels: Some(labels),
                ..Default::default()
            },
            spec: TriggerSpec {
                template_ref: Some(template_ref),
                enabled: true,
                lifetime: None,
                workflow: None,
            },
        };

        match api.create(&PostParams::default(), &trigger).await {
            Ok(creation) => Ok(Some(creation.into())),
            Err(err) => Err(err.into()),
        }
    }

    /// Delete an automated workflow trigger
    async fn delete_trigger(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>, anyhow::Error> {
        let client = setup_client(ctx).await?;
        let UserClaims { posix_uid, .. } = get_posix_from_ctx(ctx).await?;
        let namespace = visit.map_or(String::from("events"), |v| v.to_string());
        let api: Api<Trigger> = Api::namespaced(client, &namespace);

        let trigger = get_trigger_with_matching_posix(&api, &posix_uid, &name)
            .await?
            .ok_or(TriggerError::TriggerNotFound(name.clone()))?;

        api.delete(&name, &DeleteParams::default()).await?;
        Ok(Some(trigger.into()))
    }

    /// Disable an automated workflow trigger
    async fn disable_trigger(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>> {
        let client = setup_client(ctx).await?;
        let UserClaims { posix_uid, .. } = get_posix_from_ctx(ctx).await?;

        let namespace = visit.map_or(String::from("events"), |v| v.to_string());
        let api: Api<Trigger> = Api::namespaced(client, &namespace);
        get_trigger_with_matching_posix(&api, &posix_uid, &name).await?;
        toggle_trigger(&api, &name, false).await
    }

    /// Reactivate a disabled automated workflow trigger
    async fn enable_trigger(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>> {
        let client = setup_client(ctx).await?;
        let UserClaims { posix_uid, .. } = get_posix_from_ctx(ctx).await?;

        let namespace = visit.map_or(String::from("events"), |v| v.to_string());
        let api: Api<Trigger> = Api::namespaced(client, &namespace);
        get_trigger_with_matching_posix(&api, &posix_uid, &name).await?;
        toggle_trigger(&api, &name, true).await
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        graphql::triggers::{TriggerMutation, TriggerQuery},
        KubernetesApiUrl,
    };

    use async_graphql::{EmptySubscription, PathSegment, Pos, Schema, ServerError};
    use auth_core::validate_token::ValidatedAuthToken;
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
        preferred_username: String,
        fedid: String,
    }

    fn test_token() -> ValidatedAuthToken {
        let claims = TestClaims {
            posix_uid: "7357".into(),
            preferred_username: "test-pref-user".into(),
            fedid: "abc12345".into(),
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

    async fn mock_single_trigger_op(
        server: &mut ServerGuard,
        method: &str,
        name: &str,
        ns: &str,
        response_fixture: &str,
    ) -> mockito::Mock {
        server
            .mock(
                method,
                &format!("/apis/workflows.diamond.ac.uk/v1alpha1/namespaces/{ns}/triggers/{name}")
                    [..],
            )
            .with_status(200)
            .match_query(Matcher::Any)
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
        "get-single-trigger.json",
        "DELETE",
        "get-single-trigger.json",
        "deleteTrigger"
    )]
    #[case(
        "get-single-trigger.json",
        "PATCH",
        "get-disabled-trigger.json",
        "disableTrigger"
    )]
    #[case(
        "get-disabled-trigger.json",
        "PATCH",
        "get-single-trigger.json",
        "enableTrigger"
    )]
    #[tokio::test]
    async fn trigger_mutations(
        #[case] get_result: &str,
        #[case] method: &str,
        #[case] mutation_result: &str,
        #[case] mutation_name: &str,
    ) -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "ks10000-1",
            get_result,
        )
        .await;
        mock_single_trigger_op(
            &mut ctx.server,
            method,
            "example-trigger-mfvpj",
            "ks10000-1",
            mutation_result,
        )
        .await;
        let query = format!(
            r#"
            mutation {{
                {}(name: "example-trigger-mfvpj", visit: {{
                        proposalCode: "ks",
                        proposalNumber: 10000,
                        number: 1
                }})
                {{
                    name
                }}
            }}
        "#,
            mutation_name
        );

        let response = ctx.schema.execute(query).await;
        get_mock.assert();
        let actual = response.data.into_json()?;

        assert_eq!(
            actual,
            json!({
                mutation_name: {
                    "name": "example-trigger-mfvpj",
                }
            })
        );
        Ok(())
    }

    #[rstest]
    #[case("DELETE", "deleteTrigger")]
    #[case("PATCH", "disableTrigger")]
    #[case("PATCH", "enableTrigger")]
    #[tokio::test]
    async fn forbidden_trigger_operations(
        #[case] mutation_http_method: &str,
        #[case] mutation_name: &str,
    ) -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "ks10000-1",
            "unauthorised-trigger.json",
        )
        .await;
        let mutation_mock = mock_single_trigger_op(
            &mut ctx.server,
            mutation_http_method,
            "example-trigger-mfvpj",
            "ks10000-1",
            "get-single-trigger.json",
        )
        .await;
        let query = format!(
            r#"
            mutation {{
            {}(name: "example-trigger-mfvpj", visit: {{
                        proposalCode: "ks",
                        proposalNumber: 10000,
                        number: 1
                }})
                {{
                    name
                }}
            }}
            "#,
            mutation_name
        );

        let response = ctx.schema.execute(query).await;
        get_mock.assert();
        mutation_mock.expect(0).assert();
        let err = response.into_result().unwrap_err();
        let exp_err = ServerError {
            message: "Permission denied: You may only access your own triggers".into(),
            locations: vec![Pos {
                line: 3,
                column: 13,
            }],
            source: None,
            path: vec![PathSegment::Field(mutation_name.into())],
            extensions: None,
        };

        assert_eq!(err[0], exp_err);
        Ok(())
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

    #[rstest]
    #[case(
        "example-trigger-mfvpj",
        "events",
        r#"
            query {
                workflowTrigger(reference: {name: "example-trigger-mfvpj"}) {
                    name
                    beamline
                    session
                    expiry
                    workflowTemplateName
                }
            }
        "#,
        "get-single-trigger.json",
        json!({
            "workflowTrigger": {
                "name": "example-trigger-mfvpj",
                "beamline": "test-beamline",
                "session": "any",
                "expiry": "2026-07-18T08:19:18+00:00",
                "workflowTemplateName": ["example-template"]
            }
        })
    )]
    #[case(
        "test-trigger-s6qzl",
        "mg36964-1",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "test-trigger-s6qzl",
                        session: {
                            proposalCode: "mg"
                            proposalNumber: 36964
                            number: 1
                        }
                    }
                ) {
                    name
                    beamline
                    enabled
                }
            }
        "#,
        "namespaced-trigger.json",
        json!({
            "workflowTrigger": {
                "name": "test-trigger-s6qzl",
                "beamline": "b01-1",
                "enabled": true
            }
        })
    )]
    // Fedid is used as creatorId
    #[case(
        "test-trigger-s6qzl",
        "mg36964-1",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "test-trigger-s6qzl",
                        session: {
                            proposalCode: "mg"
                            proposalNumber: 36964
                            number: 1
                        }
                    }
                ) {
                    session
                    creator {
                        creatorId
                    }
                }
            }
        "#,
        "namespaced-trigger.json",
        json!({
            "workflowTrigger": {
                "session": "mg36964-1",
                "creator": {
                    "creatorId": "abc12345"
                }
            }
        })
    )]
    // Preferred username is prioritised above fedid
    #[case(
        "custom-name",
        "events",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "custom-name",
                    }
                ) {
                    creator {
                        creatorId
                    }
                }
            }
        "#,
        "named-trigger.json",
        json!({
            "workflowTrigger": {
                "creator": {
                    "creatorId": "test-preferred-user"
                }
            }
        })
    )]
    // missing creator labels returns "Unknown"
    #[case(
        "example-trigger-mfvpj",
        "events",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "example-trigger-mfvpj",
                    }
                ) {
                    creator {
                        creatorId
                    }
                }
            }
        "#,
        "get-single-trigger.json",
        json!({
            "workflowTrigger": {
                "creator": {
                    "creatorId": "Unknown"
                }
            }
        })
    )]
    // missing namespace returns "Unknown"
    #[case(
        "example-trigger-mfvpj",
        "events",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "example-trigger-mfvpj",
                    }
                ) {
                    session
                }
            }
        "#,
        "no-namespace-trigger.json",
        json!({
            "workflowTrigger": {
                "session": "Unknown"
            }
        })
    )]
    // lifetime hours work
    #[case(
        "test-trigger-s6qzl",
        "mg36964-1",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "test-trigger-s6qzl",
                        session: {
                            proposalCode: "mg"
                            proposalNumber: 36964
                            number: 1
                        }
                    }
                ) {
                    expiry
                }
            }
        "#,
        "namespaced-trigger.json",
        json!({
            "workflowTrigger": {
                "expiry": "2026-07-01T14:20:59+00:00"
            }
        })
    )]
    // lifetime minutes work
    #[case(
        "custom-name",
        "events",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "custom-name"
                    }
                ) {
                    expiry
                }
            }
        "#,
        "named-trigger.json",
        json!({
            "workflowTrigger": {
                "expiry": "2026-07-01T13:21:59+00:00"
            }
        })
    )]
    // lifetime seconds work
    #[case(
        "example-trigger-mfvpj",
        "events",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "example-trigger-mfvpj"
                    }
                ) {
                    expiry
                }
            }
        "#,
        "no-namespace-trigger.json",
        json!({
            "workflowTrigger": {
                "expiry": "2026-07-17T08:19:19+00:00"
            }
        })
    )]
    // forever lifetime works
    #[case(
        "example-trigger-kdfrm",
        "events",
        r#"
            query {
                workflowTrigger(
                    reference: {
                        name: "example-trigger-kdfrm"
                    }
                ) {
                    expiry
                }
            }
        "#,
        "forever-trigger.json",
        json!({
            "workflowTrigger": {
                "expiry": null
            }
        })
    )]
    #[tokio::test]
    async fn get_single_trigger(
        #[case] trigger_name: &str,
        #[case] ns: &str,
        #[case] query: &str,
        #[case] mock_response_file: &str,
        #[case] expected: Value,
    ) -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;

        let mock =
            mock_single_trigger_op(&mut ctx.server, "GET", trigger_name, ns, mock_response_file)
                .await;

        let actual = execute(&ctx.schema, query).await?;

        mock.assert_async().await;

        assert_eq!(actual, expected);
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
                workflowTriggers {
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
            "workflowTriggers": {
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
