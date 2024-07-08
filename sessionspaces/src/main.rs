#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]
#![doc = include_str!("../README.md")]

/// Known instruments
pub mod instruments;
/// ISPyB permissionables tables
pub mod permissionables;
/// Kubernetes resource templating
mod resources;

use crate::permissionables::Sessions;
use clap::Parser;
use ldap3::LdapConnAsync;
use resources::{create_configmap, create_namespace, delete_namespace};
use sqlx::mysql::MySqlPoolOptions;
use std::collections::BTreeSet;
use tokio::time::{sleep_until, Instant};
use tracing::{info, warn};
use url::Url;

/// SessionSpaces periodically polls the authorization bundle server and applies templates to the cluster accordingly
#[derive(Debug, Parser)]
struct Cli {
    /// The URL of the ISPyB instance which should be connected to
    #[clap(long, env)]
    database_url: Url,
    /// The URL of the LDAP database where the posix attributes are stored
    #[clap(long, env)]
    ldap_url: Url,
    /// The period to wait after a succesful bundle server request
    #[clap(long, env, default_value = "60s")]
    update_interval: humantime::Duration,
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

    let (conn, mut ldap_connection) = LdapConnAsync::new(args.ldap_url.as_str()).await.unwrap();
    ldap3::drive!(conn);

    let k8s_client = kube::Client::try_default().await.unwrap();
    let mut current_sessions = Sessions::default();
    let mut request_at = Instant::now();
    loop {
        sleep_until(request_at).await;
        match Sessions::fetch(&ispyb_pool, &mut ldap_connection).await {
            Ok(mut new_sessions) => {
                update_sessionspaces(&mut current_sessions, &mut new_sessions, &k8s_client).await;
                request_at = request_at.checked_add(*args.update_interval).unwrap();
            }
            Err(err) => warn!("Encountered error when fetching sessions: {err}"),
        }
    }
}

/// Updates the k8s resources in all sessionspaces according to observed changes between current and new [`Sessions`].
async fn update_sessionspaces(
    current_sessions: &mut Sessions,
    new_sessions: &mut Sessions,
    k8s_client: &kube::Client,
) {
    let current_session_names = current_sessions.keys().cloned().collect::<BTreeSet<_>>();
    let new_session_names = new_sessions.keys().cloned().collect::<BTreeSet<_>>();
    let to_update = current_session_names
        .union(&new_session_names)
        .collect::<BTreeSet<_>>();

    info!("Updating {} SessionSpaces", to_update.len());
    for namespace in to_update.into_iter() {
        if let Err(err) = update_sessionspace(
            namespace.clone(),
            current_sessions,
            new_sessions,
            k8s_client,
        )
        .await
        {
            warn!("Encountered error when trying to update resources: {err}")
        }
    }
}

/// Updates a single sessionspace according to the changes between a current and new [`permissionables::Session`].
async fn update_sessionspace(
    namespace: String,
    current_sessions: &mut Sessions,
    new_sessions: &mut Sessions,
    k8s_client: &kube::Client,
) -> Result<(), anyhow::Error> {
    match (
        current_sessions.get(&namespace),
        new_sessions.remove(&namespace),
    ) {
        (Some(_), None) => {
            info!("Deleting Namespace: {}", namespace);
            delete_namespace(&namespace, k8s_client.clone()).await?;
            current_sessions.remove(&namespace);
        }
        (None, Some(new_session)) => {
            info!(
                "Creating Namespace, {}, with Config: {}",
                namespace, new_session
            );
            create_namespace(namespace.clone(), k8s_client.clone()).await?;
            create_configmap(&namespace, new_session.clone(), k8s_client.clone()).await?;
            current_sessions.insert(namespace, new_session);
        }
        (Some(current_session), Some(new_session)) if current_session != &new_session => {
            info!(
                "Updating Namespace, {}, with Config: {}",
                namespace, new_session
            );
            create_configmap(&namespace, new_session.clone(), k8s_client.clone()).await?;
            current_sessions.insert(namespace, new_session);
        }
        (_, _) => {}
    }
    Ok(())
}
