#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]
#![warn(missing_docs)]
use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    sync::OnceLock,
};

use axum::{Router, routing::get};
use clap::Parser;
use tokio::signal::unix::{SignalKind, signal};
use tracing::info;
use tracing_subscriber::EnvFilter;

use crate::{config::AuthBrokerConfig, state::AuthBrokerState};

mod config;
mod ext_authz;
mod health;
mod k8s;
mod state;

static CRYPTO_PROVIDER: OnceLock<()> = OnceLock::new();

#[derive(Parser, Debug)]
#[command(author, version, about)]
struct ServeArgs {
    #[arg(
        short,
        long,
        env = "WORKFLOWS_AUTH_BROKER_CONFIG",
        default_value = "config.yaml"
    )]
    config: String,
}

#[derive(Debug, Parser)]
#[allow(clippy::large_enum_variant)]
enum Cli {
    Serve(ServeArgs),
}

#[tokio::main]
async fn main() -> auth_core::Result<()> {
    CRYPTO_PROVIDER.get_or_init(|| {
        auth_core::rustls::crypto::aws_lc_rs::default_provider()
            .install_default()
            .expect("Failed to install rustls CryptoProvider");
    });

    dotenvy::dotenv().ok();
    let args = Cli::parse();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_env("LOG_LEVEL"))
        .init();

    match args {
        Cli::Serve(args) => {
            let config = AuthBrokerConfig::from_file(&args.config)
                .map_err(|e| anyhow::anyhow!("failed to read config {}: {e:?}", args.config))?;
            let port = config.common.port;
            let state = AuthBrokerState::new(config)
                .await
                .map_err(|e| anyhow::anyhow!("failed to initialise broker state: {e:?}"))?;

            let router = Router::new()
                .route("/healthz", get(health::health_check))
                .fallback(ext_authz::authorize_request)
                .with_state(state);

            let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), port);
            info!("auth-broker listening on {addr}");
            let listener = tokio::net::TcpListener::bind(addr)
                .await
                .map_err(|e| anyhow::anyhow!("failed to bind on {addr}: {e}"))?;

            axum::serve(listener, router.into_make_service())
                .with_graceful_shutdown(shutdown_signal())
                .await
                .map_err(|e| anyhow::anyhow!("server error: {e}"))?;
        }
    }

    Ok(())
}

async fn shutdown_signal() {
    let mut sigterm = signal(SignalKind::terminate()).expect("Failed to listen for SIGTERM");
    sigterm.recv().await;
    info!("received SIGTERM, shutting down");
}
