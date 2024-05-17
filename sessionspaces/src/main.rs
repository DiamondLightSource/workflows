#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]
#![doc = include_str!("../README.md")]

/// ISPyB permissionables tables
mod permissionables;
/// Kubernetes resource templating
mod resources;

use crate::{
    permissionables::{Session, SubjectSession},
    resources::{
        create_argo_workflows_role, create_argo_workflows_service_account, create_namespace,
        create_visit_member_role, create_visit_member_service_account, delete_namespace,
    },
};
use clap::Parser;
use sqlx::{mysql::MySqlPoolOptions, MySqlPool};
use std::collections::{BTreeMap, BTreeSet};
use tokio::time::{sleep_until, Instant};
use tracing::{info, instrument, warn};
use url::Url;

/// SessionSpaces periodically polls the authorization bundle server and applies templates to the cluster accordingly
#[derive(Debug, Parser)]
struct Cli {
    /// The URL of the ISPyB instance which should be connected to
    #[clap(long, env)]
    database_url: Url,
    /// The period to wait after a succesful bundle server request
    #[clap(long, env, default_value = "60s")]
    update_interval: humantime::Duration,
    /// The period to wait after an unsuccesful bundle server request
    #[arg(long, env, default_value = "10s")]
    retry_interval: humantime::Duration,
    /// The [`tracing::Level`] to log at
    #[arg(long, env="LOG_LEVEL", default_value_t=tracing::Level::INFO)]
    log_level: tracing::Level,
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    dotenvy::dotenv().ok();
    let args = Cli::parse();

    tracing_subscriber::fmt()
        .with_max_level(args.log_level)
        .init();

    let ispyb_pool = MySqlPoolOptions::new()
        .connect(args.database_url.as_str())
        .await
        .unwrap();

    let k8s_client = kube::Client::try_default().await.unwrap();
    info!("Creating argo-workflows Role");
    create_argo_workflows_role(k8s_client.clone())
        .await
        .unwrap();
    info!("Creating visit-member Role");
    create_visit_member_role(k8s_client.clone()).await.unwrap();

    let mut current_sessions = SessionSpaces::default();
    let mut request_at = Instant::now();
    loop {
        sleep_until(request_at).await;
        let interval =
            match perform_update(&ispyb_pool, k8s_client.clone(), &mut current_sessions).await {
                Ok(_) => args.update_interval,
                Err(_) => args.retry_interval,
            };
        request_at = request_at.checked_add(*interval).unwrap();
    }
}

/// A mapping of session namespaces to their member subjects
#[derive(Debug, Default, derive_more::Deref)]
struct SessionSpaces(BTreeMap<String, BTreeSet<String>>);

impl SessionSpaces {
    #[instrument(skip_all)]
    fn new(sessions: Vec<Session>, subject_sessions: Vec<SubjectSession>) -> Self {
        let mut spaces = BTreeMap::new();
        for session in sessions.into_iter() {
            spaces.insert(
                session.id,
                (
                    format!("{}{}-{}", session.code, session.proposal, session.visit),
                    BTreeSet::new(),
                ),
            );
        }
        for SubjectSession { subject, session } in subject_sessions.into_iter() {
            if let Some(space) = spaces.get_mut(&session) {
                space.1.insert(subject);
            }
        }
        Self(spaces.into_values().collect())
    }
}

/// Requests a new bundle from the bundle server and performs templating accordingly
#[instrument(skip(k8s_client, current_sessions), err(level=tracing::Level::WARN))]
async fn perform_update(
    ispyb_pool: &MySqlPool,
    k8s_client: kube::Client,
    current_sessions: &mut SessionSpaces,
) -> Result<(), anyhow::Error> {
    info!("Fetching Sessions");
    let sessions = Session::fetch(ispyb_pool).await?;
    info!("Fetching Subjects");
    let subjects = SubjectSession::fetch(ispyb_pool).await?;
    let sessions = SessionSpaces::new(sessions, subjects);

    let current_session_names = current_sessions.keys().cloned().collect::<BTreeSet<_>>();
    let session_names = sessions.keys().cloned().collect::<BTreeSet<_>>();
    let to_update = current_session_names
        .union(&session_names)
        .collect::<BTreeSet<_>>();

    info!("Updating {} SessionSpaces", to_update.len());
    for namespace in to_update.into_iter() {
        let current_exists = current_sessions.contains_key(namespace);
        let new_exists = sessions.contains_key(namespace);
        let current_members = current_sessions.get(namespace);
        let members = sessions.get(namespace);
        if current_exists && !new_exists {
            info!("Deleting Namespace: {}", namespace);
            delete_namespace(namespace, k8s_client.clone()).await?;
        } else if !current_exists && new_exists {
            info!("Creating Namespace: {}", namespace);
            create_namespace(namespace.clone(), k8s_client.clone()).await?;
            create_argo_workflows_service_account(namespace.clone(), k8s_client.clone()).await?;
            if let Some(members) = sessions.get(namespace) {
                create_visit_member_service_account(
                    namespace.clone(),
                    members.clone(),
                    k8s_client.clone(),
                )
                .await?;
            }
        } else if members.is_some() {
            if current_members.is_none() || current_members.as_ref() != Some(&members.unwrap()) {
                info!(
                    "Updating Member Service Account in Namespace: {}",
                    namespace
                );
                if let Some(members) = sessions.get(namespace) {
                    create_visit_member_service_account(
                        namespace.clone(),
                        members.clone(),
                        k8s_client.clone(),
                    )
                    .await?;
                }
            }
        }
    }
    *current_sessions = sessions;
    Ok(())
}
