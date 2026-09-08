//! Metacontroller webhook for materializing and removing SessionSpace resources.

mod handler;
mod reconcile;
mod status;
pub(crate) mod types;

use axum::{
    Router,
    routing::{get, post},
};

/// Runs the webhook server until it exits.
pub async fn run() {
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/sync", post(handler::sync))
        .route("/healthz", get(handler::health));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();

    tracing::info!("webhook listening on :8080");

    axum::serve(listener, app).await.unwrap();
}
