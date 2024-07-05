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
use resources::update_resources;
use sqlx::mysql::MySqlPoolOptions;
use tokio::time::{sleep_until, Instant};
use tracing::warn;
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

    let (conn, mut ldap_connection) = LdapConnAsync::new(args.ldap_url.as_str()).await.unwrap();
    ldap3::drive!(conn);

    let k8s_client = kube::Client::try_default().await.unwrap();
    let mut current_sessions = Sessions::default();
    let mut request_at = Instant::now();
    loop {
        sleep_until(request_at).await;
        if let Ok(new_sessions) = async {
            let new_sessions = Sessions::fetch(&ispyb_pool, &mut ldap_connection).await?;
            update_resources(k8s_client.clone(), &current_sessions, &new_sessions).await?;
            Ok::<_, anyhow::Error>(new_sessions)
        }
        .await
        {
            current_sessions = new_sessions;
            request_at = request_at.checked_add(*args.update_interval).unwrap();
        } else {
            request_at = request_at.checked_add(*args.retry_interval).unwrap();
        };
    }
}
