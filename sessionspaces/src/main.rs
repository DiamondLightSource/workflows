#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]
#![doc = include_str!("../README.md")]

/// ISPyB permissionables tables
pub mod permissionables;
/// Kubernetes resource templating
mod resources;

use crate::{
    permissionables::Sessions,
    resources::{create_configmap, create_namespace, delete_namespace},
};
use clap::Parser;
use ldap3::{Ldap, LdapConnAsync};
use sqlx::{mysql::MySqlPoolOptions, MySqlPool};
use std::collections::BTreeSet;
use tokio::time::{sleep_until, Instant};
use tracing::{info, instrument, warn};
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

    let (conn, mut ldap) = LdapConnAsync::new(args.ldap_url.as_str()).await.unwrap();
    ldap3::drive!(conn);

    let k8s_client = kube::Client::try_default().await.unwrap();
    let mut current_sessions = Sessions::default();
    let mut request_at = Instant::now();
    loop {
        sleep_until(request_at).await;
        let interval = match perform_update(
            &ispyb_pool,
            k8s_client.clone(),
            &mut current_sessions,
            &mut ldap,
        )
        .await
        {
            Ok(_) => args.update_interval,
            Err(_) => args.retry_interval,
        };
        request_at = request_at.checked_add(*interval).unwrap();
    }
}

/// Requests a new bundle from the bundle server and performs templating accordingly
#[instrument(skip(k8s_client, current_sessions), err(level=tracing::Level::WARN))]
async fn perform_update(
    ispyb_pool: &MySqlPool,
    k8s_client: kube::Client,
    current_sessions: &mut Sessions,
    ldap_connection: &mut Ldap,
) -> std::result::Result<(), anyhow::Error> {
    let sessions = Sessions::fetch(ispyb_pool, ldap_connection).await?;
    let current_session_names = current_sessions.keys().cloned().collect::<BTreeSet<_>>();
    let session_names = sessions.keys().cloned().collect::<BTreeSet<_>>();
    let to_update = current_session_names
        .union(&session_names)
        .collect::<BTreeSet<_>>();

    info!("Updating {} SessionSpaces", to_update.len());
    for namespace in to_update.into_iter() {
        let session_info = sessions.get(namespace);
        let current_sesssion_info = current_sessions.get(namespace);
        match (current_sesssion_info, session_info) {
            (Some(_), None) => {
                info!("Deleting Namespace: {}", namespace);
                delete_namespace(namespace, k8s_client.clone()).await?;
            }
            (None, Some(session_info)) => {
                info!("Creating Namespace: {}", namespace);
                create_namespace(namespace.clone(), k8s_client.clone()).await?;
                create_configmap(namespace, session_info.clone(), k8s_client.clone()).await?;
            }
            (Some(current_info), Some(session_info)) if current_info != session_info => {
                info!("Updating policy configMap in Namespace: {}", namespace);
                create_configmap(namespace, session_info.clone(), k8s_client.clone()).await?;
            }
            (_, _) => {}
        }
    }
    *current_sessions = sessions;
    Ok(())
}
