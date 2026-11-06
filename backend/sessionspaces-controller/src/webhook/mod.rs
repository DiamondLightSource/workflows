//! Metacontroller webhook for materializing and removing SessionSpace resources.

mod config;
mod handler;
mod reconcile;
mod status;
pub(crate) mod types;

use std::sync::Arc;

use anyhow::Result;
use axum::{
    Router,
    routing::{get, post},
};
use clap::Parser;

/// Command-line arguments for the webhook binary.
#[derive(Debug, Parser)]
#[command(name = "webhook", about = "SessionSpace Metacontroller webhook")]
struct Args {
    /// Path to the sessionspaces-controller config file. When omitted, built-in
    /// defaults are used. Overridable with the
    /// SESSIONSPACES_CONTROLLER_CONFIG_FILE_PATH environment variable.
    #[arg(long, env = "SESSIONSPACES_CONTROLLER_CONFIG_FILE_PATH")]
    config_file: Option<String>,
}

/// Runs the webhook server until it exits, bubbling up any error to the caller.
pub async fn run() -> Result<()> {
    tracing_subscriber::fmt::init();

    let args = Args::parse();
    let config = load_config(args.config_file)?;

    let app = Router::new()
        .route("/sync", post(handler::sync))
        .route("/customize", post(handler::customize))
        .route("/healthz", get(handler::health))
        .with_state(Arc::new(config));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("webhook listening on :8080");

    axum::serve(listener, app).await?;
    Ok(())
}

/// Loads the configuration. When a config file path is configured it must exist
/// and parse; otherwise an error is returned. Without a path, built-in defaults
/// are used.
fn load_config(path: Option<String>) -> Result<config::Config> {
    let Some(path) = path else {
        tracing::info!("no config file configured; using built-in defaults");
        return Ok(config::Config::default());
    };

    tracing::info!(path, "loading config");
    config::Config::from_file(&path)
}
