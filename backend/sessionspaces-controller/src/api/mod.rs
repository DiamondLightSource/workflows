//! Private HTTP API for resolving metadata and preparing on-demand SessionSpaces.

mod config;
mod handler;
mod health;
mod instrument;
mod ispyb;
mod lookup;
mod prepare;
mod types;

use axum::{
    Router,
    routing::{get, post},
};
use kube::{Api, Client, core::DynamicObject};
use sqlx::{MySqlPool, mysql::MySqlPoolOptions};

/// Shared Kubernetes and metadata-source connections used by HTTP handlers.
#[derive(Clone)]
struct AppState {
    database: MySqlPool,
    ldap_url: String,
    sessionspaces: Api<DynamicObject>,
}

/// Loads configuration, initializes tracing and serves health and preparation routes.
pub async fn run() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();
    let config = config::Config::from_env()?;
    let state = AppState {
        database: MySqlPoolOptions::new()
            .max_connections(5)
            .connect_lazy_with(config.database),
        ldap_url: config.ldap_url,
        sessionspaces: prepare::session_spaces(Client::try_default().await?),
    };
    let app = Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route("/dependencies", get(health::dependencies))
        .route("/prepare", post(handler::prepare))
        .with_state(state);
    let listener = tokio::net::TcpListener::bind(&config.bind).await?;
    tracing::info!(bind = %config.bind, "SessionSpaces API listening");
    axum::serve(listener, app).await?;
    Ok(())
}
