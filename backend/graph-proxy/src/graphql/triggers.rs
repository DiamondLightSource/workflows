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
    api::{DeleteParams, ListParams, ObjectMeta, Patch, PatchParams, PostParams, Preconditions},
    core::{duration::Duration, response::reason},
    Api, Client, Config, CustomResource, ResourceExt,
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
    #[error("Workflow Trigger not found: {source}")]
    TriggerNotFound {
        name: String,
        source: Box<kube::Error>,
    },
    #[error("Workflow Trigger already exists: {source}")]
    TriggerAlreadyExists { source: Box<kube::Error> },
    #[error("Workflow Trigger invalid: {source}")]
    InvalidTrigger {
        message: String,
        source: Box<kube::Error>,
    },
    #[error(r#"No updatable fields were provided"#)]
    NoUpdatableFields,
    #[error(transparent)]
    Kube(Box<kube::Error>),
}

impl From<kube::Error> for TriggerError {
    fn from(err: kube::Error) -> Self {
        Self::Kube(Box::new(err))
    }
}

/// Convert generic kubernetes error into most specific TriggerError available
fn convert_kube_error_into_trigger_error(err: kube::Error) -> TriggerError {
    match err {
        kube::Error::Api(ref status) if status.is_already_exists() => {
            TriggerError::TriggerAlreadyExists {
                source: Box::new(err),
            }
        }
        kube::Error::Api(ref status) if status.reason == reason::INVALID => {
            TriggerError::InvalidTrigger {
                message: status.message.clone(),
                source: Box::new(err),
            }
        }
        other => other.into(),
    }
}

/// Label holding the POSIX uid of the trigger's owner; used for ownership checks
const POSIX_UID_LABEL: &str = "workflows.diamond.ac.uk/posixuid";
/// Label holding the token subject of the trigger's creator
const CREATOR_LABEL: &str = "workflows.diamond.ac.uk/creator";
/// Label holding the preferred username of the trigger's creator
const CREATOR_PREFERRED_USERNAME_LABEL: &str = "workflows.diamond.ac.uk/creator-preferred-username";
/// Label holding the Fed-ID of the trigger's creator
const CREATOR_FEDID_LABEL: &str = "workflows.diamond.ac.uk/creator-fedid";
/// Label holding the beamline a trigger monitors
const BEAMLINE_LABEL: &str = "workflows.diamond.ac.uk/beamline";

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

/// Categories of expected workflow trigger mutation failure
#[derive(Debug, Clone, Copy, Eq, PartialEq, Enum)]
enum WorkflowTriggerMutationErrorCode {
    /// The caller is not allowed to create or modify the trigger
    Forbidden,
    /// The trigger does not exist
    NotFound,
    /// A trigger with the requested name already exists
    AlreadyExists,
    /// The supplied input is not valid for the requested operation
    InvalidInput,
}

/// An expected failure encountered while creating or modifying a workflow trigger
#[derive(Debug, Clone, SimpleObject)]
struct WorkflowTriggerMutationError {
    /// A machine-readable category for the failure
    code: WorkflowTriggerMutationErrorCode,
    /// A human-readable description of the failure
    message: String,
}

/// Input for creating a workflow trigger
#[derive(Debug, InputObject)]
struct CreateWorkflowTriggerInput {
    /// The name of the ClusterTriggerTemplate to create the trigger from
    template_ref: String,
    /// An explicit name for the trigger. If omitted, a name is generated
    name: Option<String>,
    /// The session the trigger belongs to. If omitted, the trigger is visit-agnostic
    session: Option<VisitInput>,
}

/// Input for updating the editable properties of a workflow trigger
#[derive(Debug, InputObject)]
struct UpdateWorkflowTriggerInput {
    /// Identifies the trigger to update
    reference: WorkflowTriggerReferenceInput,
    /// The new ClusterTriggerTemplate reference. If omitted, the current value is kept
    template_ref: Option<String>,
}

/// Input for deleting a workflow trigger
#[derive(Debug, InputObject)]
struct DeleteWorkflowTriggerInput {
    /// Identifies the trigger to delete
    reference: WorkflowTriggerReferenceInput,
}

/// Input for enabling a workflow trigger
#[derive(Debug, InputObject)]
struct EnableWorkflowTriggerInput {
    /// Identifies the trigger to enable
    reference: WorkflowTriggerReferenceInput,
}

/// Input for disabling a workflow trigger
#[derive(Debug, InputObject)]
struct DisableWorkflowTriggerInput {
    /// Identifies the trigger to disable
    reference: WorkflowTriggerReferenceInput,
}

/// The result of creating a workflow trigger
#[derive(Debug, SimpleObject)]
struct CreateWorkflowTriggerPayload {
    /// The trigger that was created, if creation succeeded
    workflow_trigger: Option<WorkflowTrigger>,
    /// Expected failures encountered while creating the trigger
    errors: Vec<WorkflowTriggerMutationError>,
}

/// The result of updating a workflow trigger
#[derive(Debug, SimpleObject)]
struct UpdateWorkflowTriggerPayload {
    /// The trigger after the update, if it succeeded
    workflow_trigger: Option<WorkflowTrigger>,
    /// Expected failures encountered while updating the trigger
    errors: Vec<WorkflowTriggerMutationError>,
}

/// The result of enabling a workflow trigger
#[derive(Debug, SimpleObject)]
struct EnableWorkflowTriggerPayload {
    /// The enabled trigger, if the operation succeeded
    workflow_trigger: Option<WorkflowTrigger>,
    /// Expected failures encountered while enabling the trigger
    errors: Vec<WorkflowTriggerMutationError>,
}

/// The result of disabling a workflow trigger
#[derive(Debug, SimpleObject)]
struct DisableWorkflowTriggerPayload {
    /// The disabled trigger, if the operation succeeded
    workflow_trigger: Option<WorkflowTrigger>,
    /// Expected failures encountered while disabling the trigger
    errors: Vec<WorkflowTriggerMutationError>,
}

/// The result of deleting a workflow trigger
#[derive(Debug, SimpleObject)]
struct DeleteWorkflowTriggerPayload {
    /// The name of the trigger that was deleted, if deletion succeeded
    deleted_workflow_trigger_name: Option<String>,
    /// Expected failures encountered while deleting the trigger
    errors: Vec<WorkflowTriggerMutationError>,
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
                .get(CREATOR_PREFERRED_USERNAME_LABEL)
                .or_else(|| l.get(CREATOR_FEDID_LABEL))
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
                .get(CREATOR_PREFERRED_USERNAME_LABEL)
                .or_else(|| l.get(CREATOR_FEDID_LABEL))
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
                .and_then(|l| l.get(BEAMLINE_LABEL).cloned()),
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
                .and_then(|l| l.get(BEAMLINE_LABEL).cloned()),
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

/// Fetches the referenced trigger after checking the caller owns it.
/// Returns the trigger together with an API scoped to its namespace.
async fn get_owned_trigger(
    ctx: &Context<'_>,
    reference: WorkflowTriggerReferenceInput,
) -> Result<(Api<Trigger>, Trigger), TriggerError> {
    let client = setup_client(ctx).await?;
    let UserClaims { posix_uid, .. } = get_posix_from_ctx(ctx).await?;
    let api: Api<Trigger> = Api::namespaced(client, &session_namespace(reference.session));
    let trigger = match api.get(&reference.name).await {
        Ok(trigger) => trigger,
        Err(kube::Error::Api(status)) if status.code == 404 => {
            return Err(TriggerError::TriggerNotFound {
                name: reference.name,
                source: Box::new(kube::Error::Api(status)),
            });
        }
        Err(err) => return Err(err.into()),
    };
    let owned_by_caller = trigger
        .labels()
        .get(POSIX_UID_LABEL)
        .is_some_and(|uid| *uid == posix_uid);
    if !owned_by_caller {
        return Err(TriggerError::ForbiddenAccess);
    }
    Ok((api, trigger))
}

/// Uses the provided API to retrieve a Trigger without checking the posix uid
async fn get_trigger(api: &Api<Trigger>, name: &str) -> anyhow::Result<Option<WorkflowTrigger>> {
    api.get(name)
        .await
        .map_or_else(|err| Err(err.into()), |t| Ok(Some(t.into())))
}

/// Merge-patches the `spec` of a Trigger with the supplied fields.
/// The patch carries the trigger's `resourceVersion`, so it fails with a conflict if the
/// trigger has changed since it was fetched (e.g. deleted and recreated by another user).
async fn patch_trigger_spec(
    api: &Api<Trigger>,
    trigger: &Trigger,
    spec: Value,
) -> Result<WorkflowTrigger, TriggerError> {
    let patch = serde_json::json!({
        "metadata": { "resourceVersion": trigger.resource_version() },
        "spec": spec,
    });
    let trigger_patched = api
        .patch(
            &trigger.name_any(),
            &PatchParams::apply("graph-proxy"),
            &Patch::Merge(&patch),
        )
        .await
        .map_err(convert_kube_error_into_trigger_error)?;
    Ok(trigger_patched.into())
}

/// Converts an expected domain failure into a [`WorkflowTriggerMutationError`].
/// Unexpected errors are returned unchanged so they surface as GraphQL errors.
fn convert_trigger_error_to_workflow_trigger_mutation_error(
    err: TriggerError,
) -> anyhow::Result<WorkflowTriggerMutationError> {
    let (code, message) = match err {
        TriggerError::ForbiddenAccess => {
            (WorkflowTriggerMutationErrorCode::Forbidden, err.to_string())
        }
        TriggerError::TriggerNotFound { name, .. } => (
            WorkflowTriggerMutationErrorCode::NotFound,
            format!("Unable to find trigger {name}"),
        ),
        TriggerError::TriggerAlreadyExists { .. } => (
            WorkflowTriggerMutationErrorCode::AlreadyExists,
            String::from("A trigger with the requested name already exists"),
        ),
        TriggerError::InvalidTrigger { message, .. } => {
            (WorkflowTriggerMutationErrorCode::InvalidInput, message)
        }
        TriggerError::NoUpdatableFields => (
            WorkflowTriggerMutationErrorCode::InvalidInput,
            err.to_string(),
        ),
        other => return Err(other.into()),
    };
    Ok(WorkflowTriggerMutationError { code, message })
}

/// The namespace holding triggers for a session; visit-agnostic triggers live in `events`
fn session_namespace(session: Option<VisitInput>) -> String {
    session.map_or(String::from("events"), |v| v.to_string())
}

/// Creates a trigger from a ClusterTriggerTemplate, labelled as owned by the caller
async fn create_owned_workflow_trigger(
    ctx: &Context<'_>,
    input: CreateWorkflowTriggerInput,
) -> Result<WorkflowTrigger, TriggerError> {
    let client = setup_client(ctx).await?;
    let UserClaims {
        posix_uid,
        preferred_username,
        fedid,
        sub,
    } = get_posix_from_ctx(ctx).await?;
    let api: Api<Trigger> = Api::namespaced(client, &session_namespace(input.session));
    let mut labels = BTreeMap::from([
        (String::from(POSIX_UID_LABEL), posix_uid),
        (String::from(CREATOR_LABEL), sub),
    ]);
    if let Some(preferred_username) = preferred_username {
        labels.insert(
            String::from(CREATOR_PREFERRED_USERNAME_LABEL),
            preferred_username,
        );
    }
    if let Some(fedid) = fedid {
        labels.insert(String::from(CREATOR_FEDID_LABEL), fedid);
    }
    let trigger = Trigger {
        metadata: ObjectMeta {
            generate_name: Some(format!("{}-", input.template_ref)),
            name: input.name,
            labels: Some(labels),
            ..Default::default()
        },
        spec: TriggerSpec {
            template_ref: Some(input.template_ref),
            enabled: true,
            lifetime: None,
            workflow: None,
        },
    };
    let created = api
        .create(&PostParams::default(), &trigger)
        .await
        .map_err(convert_kube_error_into_trigger_error)?;
    Ok(created.into())
}

/// Deletes the referenced trigger if the caller owns it, returning the trigger as it was before deletion.
/// The delete is conditional on the trigger's `uid`, so a trigger recreated since the
/// ownership check is never deleted.
async fn delete_owned_workflow_trigger(
    ctx: &Context<'_>,
    reference: WorkflowTriggerReferenceInput,
) -> Result<WorkflowTrigger, TriggerError> {
    let (api, trigger) = get_owned_trigger(ctx, reference).await?;
    let params = DeleteParams {
        preconditions: Some(Preconditions {
            uid: trigger.uid(),
            resource_version: None,
        }),
        ..Default::default()
    };
    api.delete(&trigger.name_any(), &params)
        .await
        .map_err(convert_kube_error_into_trigger_error)?;
    Ok(trigger.into())
}

/// Enables or disables the referenced trigger if the caller owns it, returning the updated trigger
async fn set_owned_workflow_trigger_enabled(
    ctx: &Context<'_>,
    reference: WorkflowTriggerReferenceInput,
    enabled: bool,
) -> Result<WorkflowTrigger, TriggerError> {
    let (api, trigger) = get_owned_trigger(ctx, reference).await?;
    patch_trigger_spec(&api, &trigger, serde_json::json!({ "enabled": enabled })).await
}

/// Updates the editable properties of the referenced trigger if the caller owns it
async fn update_owned_workflow_trigger(
    ctx: &Context<'_>,
    input: UpdateWorkflowTriggerInput,
) -> Result<WorkflowTrigger, TriggerError> {
    let Some(template_ref) = input.template_ref else {
        return Err(TriggerError::NoUpdatableFields);
    };
    let (api, trigger) = get_owned_trigger(ctx, input.reference).await?;
    patch_trigger_spec(
        &api,
        &trigger,
        serde_json::json!({ "templateRef": template_ref }),
    )
    .await
}

/// Splits an operation outcome into the `(value, errors)` fields shared by every payload.
/// Expected failures become payload errors; unexpected ones are returned as GraphQL errors.
fn into_payload_fields<T>(
    result: Result<T, TriggerError>,
) -> anyhow::Result<(Option<T>, Vec<WorkflowTriggerMutationError>)> {
    match result {
        Ok(value) => Ok((Some(value), vec![])),
        Err(err) => Ok((
            None,
            vec![convert_trigger_error_to_workflow_trigger_mutation_error(
                err,
            )?],
        )),
    }
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
        let api: Api<Trigger> = Api::namespaced(client, &session_namespace(reference.session));
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
    /// Create a workflow trigger from a workflow trigger template
    async fn create_workflow_trigger(
        &self,
        ctx: &Context<'_>,
        input: CreateWorkflowTriggerInput,
    ) -> anyhow::Result<Option<CreateWorkflowTriggerPayload>> {
        let result = create_owned_workflow_trigger(ctx, input).await;
        let (workflow_trigger, errors) = into_payload_fields(result)?;
        Ok(Some(CreateWorkflowTriggerPayload {
            workflow_trigger,
            errors,
        }))
    }

    /// Update the editable properties of a workflow trigger
    async fn update_workflow_trigger(
        &self,
        ctx: &Context<'_>,
        input: UpdateWorkflowTriggerInput,
    ) -> anyhow::Result<Option<UpdateWorkflowTriggerPayload>> {
        let result = update_owned_workflow_trigger(ctx, input).await;
        let (workflow_trigger, errors) = into_payload_fields(result)?;
        Ok(Some(UpdateWorkflowTriggerPayload {
            workflow_trigger,
            errors,
        }))
    }

    /// Delete a workflow trigger
    async fn delete_workflow_trigger(
        &self,
        ctx: &Context<'_>,
        input: DeleteWorkflowTriggerInput,
    ) -> anyhow::Result<Option<DeleteWorkflowTriggerPayload>> {
        let result = delete_owned_workflow_trigger(ctx, input.reference).await;
        let (deleted_trigger, errors) = into_payload_fields(result)?;
        Ok(Some(DeleteWorkflowTriggerPayload {
            deleted_workflow_trigger_name: deleted_trigger.and_then(|t| t.name),
            errors,
        }))
    }

    /// Enable a workflow trigger
    async fn enable_workflow_trigger(
        &self,
        ctx: &Context<'_>,
        input: EnableWorkflowTriggerInput,
    ) -> anyhow::Result<Option<EnableWorkflowTriggerPayload>> {
        let result = set_owned_workflow_trigger_enabled(ctx, input.reference, true).await;
        let (workflow_trigger, errors) = into_payload_fields(result)?;
        Ok(Some(EnableWorkflowTriggerPayload {
            workflow_trigger,
            errors,
        }))
    }

    /// Disable a workflow trigger
    async fn disable_workflow_trigger(
        &self,
        ctx: &Context<'_>,
        input: DisableWorkflowTriggerInput,
    ) -> anyhow::Result<Option<DisableWorkflowTriggerPayload>> {
        let result = set_owned_workflow_trigger_enabled(ctx, input.reference, false).await;
        let (workflow_trigger, errors) = into_payload_fields(result)?;
        Ok(Some(DisableWorkflowTriggerPayload {
            workflow_trigger,
            errors,
        }))
    }

    #[graphql(deprecation = "Use createWorkflowTrigger instead")]
    /// Create a Trigger from a template (DEPRECATED)
    async fn create_trigger(
        &self,
        ctx: &Context<'_>,
        template_ref: String,
        name: Option<String>,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>> {
        let input = CreateWorkflowTriggerInput {
            template_ref,
            name,
            session: visit,
        };
        Ok(Some(
            create_owned_workflow_trigger(ctx, input).await?.into(),
        ))
    }

    #[graphql(deprecation = "Use deleteWorkflowTrigger instead")]
    /// Delete an automated workflow trigger (DEPRECATED)
    async fn delete_trigger(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>, anyhow::Error> {
        let reference = WorkflowTriggerReferenceInput {
            name,
            session: visit,
        };
        Ok(Some(
            delete_owned_workflow_trigger(ctx, reference).await?.into(),
        ))
    }

    #[graphql(deprecation = "Use disableWorkflowTrigger instead")]
    /// Disable an automated workflow trigger (DEPRECATED)
    async fn disable_trigger(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>> {
        let reference = WorkflowTriggerReferenceInput {
            name,
            session: visit,
        };
        Ok(Some(
            set_owned_workflow_trigger_enabled(ctx, reference, false)
                .await?
                .into(),
        ))
    }

    #[graphql(deprecation = "Use enableWorkflowTrigger instead")]
    /// Reactivate a disabled automated workflow trigger (DEPRECATED)
    async fn enable_trigger(
        &self,
        ctx: &Context<'_>,
        name: String,
        visit: Option<VisitInput>,
    ) -> anyhow::Result<Option<TriggerGQL>> {
        let reference = WorkflowTriggerReferenceInput {
            name,
            session: visit,
        };
        Ok(Some(
            set_owned_workflow_trigger_enabled(ctx, reference, true)
                .await?
                .into(),
        ))
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
        sub: String,
    }

    fn test_token() -> ValidatedAuthToken {
        let claims = TestClaims {
            posix_uid: "7357".into(),
            preferred_username: "test-pref-user".into(),
            fedid: "abc12345".into(),
            sub: "test-subject-12345".into(),
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

    /// Mocks a single trigger operation that responds with a Kubernetes `Status`
    /// error of the given HTTP `code` (e.g. 404, 409).
    async fn mock_trigger_status(
        server: &mut ServerGuard,
        method: &str,
        name: &str,
        ns: &str,
        code: u16,
        reason: &str,
    ) -> mockito::Mock {
        let status = json!({
            "kind": "Status",
            "apiVersion": "v1",
            "metadata": {},
            "status": "Failure",
            "message": format!("triggers.workflows.diamond.ac.uk \"{name}\" {reason}"),
            "reason": reason,
            "details": {
                "name": name,
                "group": "workflows.diamond.ac.uk",
                "kind": "triggers"
            },
            "code": code
        });
        server
            .mock(
                method,
                &format!("/apis/workflows.diamond.ac.uk/v1alpha1/namespaces/{ns}/triggers/{name}")
                    [..],
            )
            .with_status(code.into())
            .match_query(Matcher::Any)
            .with_header("content-type", "application/json")
            .with_body(status.to_string())
            .create_async()
            .await
    }

    /// Mocks a single trigger operation that only matches when the request body
    /// contains `expected_body`.
    async fn mock_trigger_op_matching_body(
        server: &mut ServerGuard,
        method: &str,
        name: &str,
        ns: &str,
        expected_body: Value,
        response_fixture: &str,
    ) -> mockito::Mock {
        server
            .mock(
                method,
                &format!("/apis/workflows.diamond.ac.uk/v1alpha1/namespaces/{ns}/triggers/{name}")
                    [..],
            )
            .match_query(Matcher::Any)
            .match_body(Matcher::PartialJson(expected_body))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(asset(response_fixture))
            .create_async()
            .await
    }

    /// Mocks a trigger creation that fails with a Kubernetes `Status` error.
    async fn mock_create_trigger_status(
        server: &mut ServerGuard,
        ns: &str,
        code: u16,
        reason: &str,
        message: &str,
    ) -> mockito::Mock {
        let status = json!({
            "kind": "Status",
            "apiVersion": "v1",
            "metadata": {},
            "status": "Failure",
            "message": message,
            "reason": reason,
            "code": code
        });
        server
            .mock(
                "POST",
                &format!("/apis/workflows.diamond.ac.uk/v1alpha1/namespaces/{ns}/triggers?")[..],
            )
            .with_status(code.into())
            .with_header("content-type", "application/json")
            .with_body(status.to_string())
            .create_async()
            .await
    }

    /// The `resourceVersion` of the trigger in the GET fixtures
    const FIXTURE_RESOURCE_VERSION: &str = "44311920";
    /// The `uid` of the trigger in the GET fixtures
    const FIXTURE_UID: &str = "2ff86138-9952-46f6-8d42-a60b7da9b003";

    /// Executes a mutation and asserts it succeeds with no GraphQL errors.
    async fn execute_ok(
        schema: &Schema<TriggerQuery, TriggerMutation, EmptySubscription>,
        query: impl Into<String>,
    ) -> Value {
        let response = schema.execute(query.into()).await;
        assert!(
            response.errors.is_empty(),
            "expected no GraphQL errors, got {:?}",
            response.errors
        );
        response.data.into_json().unwrap()
    }

    /// Executes a mutation and asserts it fails with a GraphQL error.
    async fn execute_err(
        schema: &Schema<TriggerQuery, TriggerMutation, EmptySubscription>,
        query: impl Into<String>,
    ) {
        let response = schema.execute(query.into()).await;
        assert!(
            !response.errors.is_empty(),
            "expected a GraphQL error, got {:?}",
            response.data
        );
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

    #[rstest]
    #[case(
        r#"
        mutation {
            createWorkflowTrigger(input: { templateRef: "test-trigger" }) {
                workflowTrigger { name }
                errors { code message }
            }
        }
        "#,
        "make-trigger.json",
        "events",
        json!({
            "createWorkflowTrigger": {
                "workflowTrigger": { "name": "test-trigger-s6qzl" },
                "errors": []
            }
        })
    )]
    #[case(
        r#"
        mutation {
            createWorkflowTrigger(input: { templateRef: "test-trigger", name: "custom-name" }) {
                workflowTrigger { name }
            }
        }
        "#,
        "named-trigger.json",
        "events",
        json!({
            "createWorkflowTrigger": {
                "workflowTrigger": { "name": "custom-name" }
            }
        })
    )]
    #[case(
        r#"
        mutation {
            createWorkflowTrigger(input: {
                templateRef: "test-trigger",
                session: { proposalCode: "mg", proposalNumber: 36964, number: 1 }
            }) {
                workflowTrigger { name }
            }
        }
        "#,
        "namespaced-trigger.json",
        "mg36964-1",
        json!({
            "createWorkflowTrigger": {
                "workflowTrigger": { "name": "test-trigger-s6qzl" }
            }
        })
    )]
    #[tokio::test]
    async fn create_workflow_trigger_mutation(
        #[case] query: &str,
        #[case] fixture: &str,
        #[case] namespace: &str,
        #[case] expected: Value,
    ) -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let mock = mock_create_trigger(&mut ctx.server, namespace, fixture).await;
        let actual = execute_ok(&ctx.schema, query).await;
        mock.assert_async().await;
        assert_eq!(actual, expected);
        Ok(())
    }

    #[tokio::test]
    async fn create_workflow_trigger_conflict_returns_payload_error() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let mock = mock_create_trigger_status(
            &mut ctx.server,
            "events",
            409,
            "AlreadyExists",
            "triggers.workflows.diamond.ac.uk \"test-trigger\" already exists",
        )
        .await;

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                createWorkflowTrigger(input: { templateRef: "test-trigger" }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        mock.assert_async().await;
        assert_eq!(
            actual,
            json!({
                "createWorkflowTrigger": {
                    "workflowTrigger": null,
                    "errors": [{
                        "code": "ALREADY_EXISTS",
                        "message": "A trigger with the requested name already exists"
                    }]
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn update_workflow_trigger_mutation() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await;
        let patch_mock = mock_trigger_op_matching_body(
            &mut ctx.server,
            "PATCH",
            "example-trigger-mfvpj",
            "events",
            json!({
                "metadata": { "resourceVersion": FIXTURE_RESOURCE_VERSION },
                "spec": { "templateRef": "test-trigger" }
            }),
            "get-single-trigger.json",
        )
        .await;

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                updateWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" },
                    templateRef: "test-trigger"
                }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        get_mock.assert();
        patch_mock.assert();
        assert_eq!(
            actual,
            json!({
                "updateWorkflowTrigger": {
                    "workflowTrigger": { "name": "example-trigger-mfvpj" },
                    "errors": []
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn update_workflow_trigger_without_fields_returns_invalid_input() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await
        .expect(0);
        let patch_mock = mock_single_trigger_op(
            &mut ctx.server,
            "PATCH",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await
        .expect(0);

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                updateWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" }
                }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        get_mock.assert();
        patch_mock.assert();
        assert_eq!(
            actual,
            json!({
                "updateWorkflowTrigger": {
                    "workflowTrigger": null,
                    "errors": [{
                        "code": "INVALID_INPUT",
                        "message": "No updatable fields were provided"
                    }]
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn update_workflow_trigger_forbidden_error() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            "unauthorised-trigger.json",
        )
        .await;
        let patch_mock = mock_single_trigger_op(
            &mut ctx.server,
            "PATCH",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await
        .expect(0);

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                updateWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" },
                    templateRef: "test-trigger"
                }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        get_mock.assert();
        patch_mock.assert();
        assert_eq!(
            actual,
            json!({
                "updateWorkflowTrigger": {
                    "workflowTrigger": null,
                    "errors": [{ "code": "FORBIDDEN", "message": "Permission denied: You may only access your own triggers" }]
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn update_workflow_trigger_not_found_error() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_trigger_status(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            404,
            "not found",
        )
        .await;
        let patch_mock = mock_single_trigger_op(
            &mut ctx.server,
            "PATCH",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await
        .expect(0);

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                updateWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" },
                    templateRef: "test-trigger"
                }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        get_mock.assert();
        patch_mock.assert();
        assert_eq!(
            actual,
            json!({
                "updateWorkflowTrigger": {
                    "workflowTrigger": null,
                    "errors": [{ "code": "NOT_FOUND", "message": "Unable to find trigger example-trigger-mfvpj" }]
                }
            })
        );
        Ok(())
    }

    #[rstest]
    #[case(
        "disableWorkflowTrigger",
        "get-single-trigger.json",
        "get-disabled-trigger.json",
        false
    )]
    #[case(
        "enableWorkflowTrigger",
        "get-disabled-trigger.json",
        "get-single-trigger.json",
        true
    )]
    #[tokio::test]
    async fn workflow_trigger_toggle_mutations(
        #[case] mutation_name: &str,
        #[case] get_result: &str,
        #[case] mutation_result: &str,
        #[case] expected_enabled: bool,
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
        let patch_mock = mock_trigger_op_matching_body(
            &mut ctx.server,
            "PATCH",
            "example-trigger-mfvpj",
            "ks10000-1",
            json!({
                "metadata": { "resourceVersion": FIXTURE_RESOURCE_VERSION },
                "spec": { "enabled": expected_enabled }
            }),
            mutation_result,
        )
        .await;
        let query = format!(
            r#"
            mutation {{
                {}(input: {{
                    reference: {{
                        name: "example-trigger-mfvpj",
                        session: {{ proposalCode: "ks", proposalNumber: 10000, number: 1 }}
                    }}
                }}) {{
                    workflowTrigger {{ name enabled }}
                    errors {{ code message }}
                }}
            }}
            "#,
            mutation_name
        );

        let actual = execute_ok(&ctx.schema, query).await;
        get_mock.assert();
        patch_mock.assert();
        assert_eq!(
            actual,
            json!({
                mutation_name: {
                    "workflowTrigger": {
                        "name": "example-trigger-mfvpj",
                        "enabled": expected_enabled
                    },
                    "errors": []
                }
            })
        );
        Ok(())
    }

    #[rstest]
    #[case("disableWorkflowTrigger")]
    #[case("enableWorkflowTrigger")]
    #[tokio::test]
    async fn workflow_trigger_toggle_forbidden_returns_payload_error(
        #[case] mutation_name: &str,
    ) -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            "unauthorised-trigger.json",
        )
        .await;
        let patch_mock = mock_single_trigger_op(
            &mut ctx.server,
            "PATCH",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await
        .expect(0);

        let query = format!(
            r#"
            mutation {{
                {}(input: {{
                    reference: {{ name: "example-trigger-mfvpj" }}
                }}) {{
                    workflowTrigger {{ name }}
                    errors {{ code message }}
                }}
            }}
            "#,
            mutation_name
        );

        let actual = execute_ok(&ctx.schema, query).await;
        get_mock.assert();
        patch_mock.assert();
        assert_eq!(
            actual,
            json!({
                mutation_name: {
                    "workflowTrigger": null,
                    "errors": [{
                        "code": "FORBIDDEN",
                        "message": "Permission denied: You may only access your own triggers"
                    }]
                }
            })
        );
        Ok(())
    }

    #[rstest]
    #[case("disableWorkflowTrigger")]
    #[case("enableWorkflowTrigger")]
    #[tokio::test]
    async fn workflow_trigger_toggle_not_found_returns_payload_error(
        #[case] mutation_name: &str,
    ) -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_trigger_status(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            404,
            "not found",
        )
        .await;
        let patch_mock = mock_single_trigger_op(
            &mut ctx.server,
            "PATCH",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await
        .expect(0);

        let query = format!(
            r#"
            mutation {{
                {}(input: {{
                    reference: {{ name: "example-trigger-mfvpj" }}
                }}) {{
                    workflowTrigger {{ name }}
                    errors {{ code message }}
                }}
            }}
            "#,
            mutation_name
        );

        let actual = execute_ok(&ctx.schema, query).await;
        get_mock.assert();
        patch_mock.assert();
        assert_eq!(
            actual,
            json!({
                mutation_name: {
                    "workflowTrigger": null,
                    "errors": [{
                        "code": "NOT_FOUND",
                        "message": "Unable to find trigger example-trigger-mfvpj"
                    }]
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn delete_workflow_trigger_mutation() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await;
        let delete_mock = mock_trigger_op_matching_body(
            &mut ctx.server,
            "DELETE",
            "example-trigger-mfvpj",
            "events",
            json!({ "preconditions": { "uid": FIXTURE_UID } }),
            "get-single-trigger.json",
        )
        .await;

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                deleteWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" }
                }) {
                    deletedWorkflowTriggerName
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        get_mock.assert();
        delete_mock.assert();
        assert_eq!(
            actual,
            json!({
                "deleteWorkflowTrigger": {
                    "deletedWorkflowTriggerName": "example-trigger-mfvpj",
                    "errors": []
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn delete_workflow_trigger_unauthorized_errors() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            "unauthorised-trigger.json",
        )
        .await;
        let delete_mock = mock_single_trigger_op(
            &mut ctx.server,
            "DELETE",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await
        .expect(0);

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                deleteWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" }
                }) {
                    deletedWorkflowTriggerName
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        get_mock.assert();
        delete_mock.assert();
        assert_eq!(
            actual,
            json!({
                "deleteWorkflowTrigger": {
                    "deletedWorkflowTriggerName": null,
                    "errors": [{ "code": "FORBIDDEN", "message": "Permission denied: You may only access your own triggers" }]
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn delete_workflow_trigger_not_found_error() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_trigger_status(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            404,
            "not found",
        )
        .await;
        let delete_mock = mock_single_trigger_op(
            &mut ctx.server,
            "DELETE",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await
        .expect(0);

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                deleteWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" }
                }) {
                    deletedWorkflowTriggerName
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        get_mock.assert();
        delete_mock.assert();
        assert_eq!(
            actual,
            json!({
                "deleteWorkflowTrigger": {
                    "deletedWorkflowTriggerName": null,
                    "errors": [{ "code": "NOT_FOUND", "message": "Unable to find trigger example-trigger-mfvpj" }]
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn unexpected_kube_error_is_graphql_error() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        mock_trigger_status(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            500,
            "Internal Error",
        )
        .await;

        execute_err(
            &ctx.schema,
            r#"
            mutation {
                enableWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" }
                }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;
        Ok(())
    }

    #[tokio::test]
    async fn create_workflow_trigger_invalid_returns_payload_error() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let message = "Trigger.workflows.diamond.ac.uk \"Bad_Name\" is invalid: metadata.name: \
                       Invalid value: \"Bad_Name\": a lowercase RFC 1123 subdomain must consist of \
                       lower case alphanumeric characters, '-' or '.'";
        let mock =
            mock_create_trigger_status(&mut ctx.server, "events", 422, "Invalid", message).await;

        let actual = execute_ok(
            &ctx.schema,
            r#"
            mutation {
                createWorkflowTrigger(input: { templateRef: "test-trigger", name: "Bad_Name" }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;

        mock.assert_async().await;
        assert_eq!(
            actual,
            json!({
                "createWorkflowTrigger": {
                    "workflowTrigger": null,
                    "errors": [{ "code": "INVALID_INPUT", "message": message }]
                }
            })
        );
        Ok(())
    }

    #[tokio::test]
    async fn create_workflow_trigger_missing_namespace_is_graphql_error() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let mock = mock_create_trigger_status(
            &mut ctx.server,
            "mg36964-1",
            404,
            "NotFound",
            "namespaces \"mg36964-1\" not found",
        )
        .await;

        execute_err(
            &ctx.schema,
            r#"
            mutation {
                createWorkflowTrigger(input: {
                    templateRef: "test-trigger",
                    session: { proposalCode: "mg", proposalNumber: 36964, number: 1 }
                }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;
        mock.assert_async().await;
        Ok(())
    }

    #[tokio::test]
    async fn trigger_changed_since_lookup_is_graphql_error() -> anyhow::Result<()> {
        let mut ctx = TestContext::new().await?;
        let get_mock = mock_single_trigger_op(
            &mut ctx.server,
            "GET",
            "example-trigger-mfvpj",
            "events",
            "get-single-trigger.json",
        )
        .await;
        let patch_mock = mock_trigger_status(
            &mut ctx.server,
            "PATCH",
            "example-trigger-mfvpj",
            "events",
            409,
            "Conflict",
        )
        .await;

        execute_err(
            &ctx.schema,
            r#"
            mutation {
                disableWorkflowTrigger(input: {
                    reference: { name: "example-trigger-mfvpj" }
                }) {
                    workflowTrigger { name }
                    errors { code message }
                }
            }
            "#,
        )
        .await;
        get_mock.assert();
        patch_mock.assert();
        Ok(())
    }

    #[test]
    fn schema_exposes_workflow_trigger_mutations() {
        let schema = Schema::build(TriggerQuery, TriggerMutation, EmptySubscription).finish();
        let sdl = schema.sdl();

        for field in [
            "createWorkflowTrigger(input: CreateWorkflowTriggerInput!): CreateWorkflowTriggerPayload",
            "updateWorkflowTrigger(input: UpdateWorkflowTriggerInput!): UpdateWorkflowTriggerPayload",
            "deleteWorkflowTrigger(input: DeleteWorkflowTriggerInput!): DeleteWorkflowTriggerPayload",
            "enableWorkflowTrigger(input: EnableWorkflowTriggerInput!): EnableWorkflowTriggerPayload",
            "disableWorkflowTrigger(input: DisableWorkflowTriggerInput!): DisableWorkflowTriggerPayload",
        ] {
            assert!(sdl.contains(field), "missing new field {field} in SDL");
        }
    }

    #[test]
    fn schema_deprecates_old_mutations() {
        let schema = Schema::build(TriggerQuery, TriggerMutation, EmptySubscription).finish();
        let sdl = schema.sdl();

        for (old, reason) in [
            (
                "createTrigger(templateRef: String!, name: String, visit: VisitInput): Trigger",
                "Use createWorkflowTrigger instead",
            ),
            (
                "deleteTrigger(name: String!, visit: VisitInput): Trigger",
                "Use deleteWorkflowTrigger instead",
            ),
            (
                "enableTrigger(name: String!, visit: VisitInput): Trigger",
                "Use enableWorkflowTrigger instead",
            ),
            (
                "disableTrigger(name: String!, visit: VisitInput): Trigger",
                "Use disableWorkflowTrigger instead",
            ),
        ] {
            assert!(sdl.contains(old), "missing deprecated field {old} in SDL");
            assert!(
                sdl.contains(&format!("@deprecated(reason: \"{reason}\")")),
                "missing deprecation reason for {old}"
            );
        }
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
