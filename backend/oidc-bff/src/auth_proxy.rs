//! Auth proxy module - alternative router configuration for proxy-only mode.
//!
//! This module provides a simplified router that only proxies requests to the
//! GraphQL backend with token injection, without the full OIDC login flow.

use std::{
    net::{Ipv4Addr, SocketAddr},
    sync::Arc,
};

use axum::{Router, middleware, routing::get};
use axum_reverse_proxy::ReverseProxy;
use clap::Parser;
use tower_sessions::{MemoryStore, SessionManagerLayer};

use crate::config::Config;
use crate::error;
use crate::healthcheck;
use crate::inject_token_from_session;
use crate::state::AppState;

type Result<T> = std::result::Result<T, error::Error>;

#[derive(Parser, Debug)]
#[command(author, version, about)]
struct Args {
    /// Path to config file (JSON or YAML)
    #[arg(
        short,
        long,
        env = "WORKFLOWS_AUTH_PROXY_CONFIG",
        default_value = "config.yaml"
    )]
    config: String,
}

/// Entry point for the auth proxy server.
///
/// This is a simplified version that only handles proxying with token injection,
/// without the full OIDC login/callback flow.
#[allow(dead_code)]
pub async fn auth_proxy_main() -> Result<()> {
    dotenvy::dotenv().ok();
    let args: Args = Args::try_parse()
        .map_err(|e| anyhow::anyhow!("CLI argument error: {}", e))?;
    let config = Config::from_file(args.config)?;
    let port = config.port;
    let appstate = Arc::new(AppState::new(config).await?);

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rust TLS cryptography");

    let router = create_proxy_router(appstate);
    serve_proxy(router, port).await
}

/// Creates a minimal router that only proxies requests with token injection.
///
/// Unlike the full router in main.rs, this doesn't include login/callback routes.
fn create_proxy_router(state: Arc<AppState>) -> Router {
    // TODO: This URL should come from config, not be hardcoded
    let proxy: Router<()> =
        ReverseProxy::new("/", "https://staging.workflows.diamond.ac.uk/graphql").into();

    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store);

    Router::new()
        .nest_service("/api", proxy)
        .layer(middleware::from_fn_with_state(
            state.clone(),
            inject_token_from_session::inject_token_from_session,
        ))
        .route("/healthcheck", get(healthcheck::healthcheck))
        .layer(session_layer)
        .with_state(state)
}

async fn serve_proxy(router: Router, port: u16) -> Result<()> {
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port)).await?;
    let service = router.into_make_service();
    axum::serve(listener, service).await?;
    Ok(())
}
