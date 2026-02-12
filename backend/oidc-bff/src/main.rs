mod healthcheck;
mod config;
mod login;
mod auth_session_data;
mod state;
mod callback;
mod database;
mod error;
mod admin_auth;

use clap::Parser;
use config::Config;
use tokio::signal::unix::{Signal, SignalKind, signal};
use tower_sessions::{MemoryStore, Session, SessionManagerLayer};
use std::{
    net::{Ipv4Addr, SocketAddr}, sync::Arc, process
};
use state::AppState;

type Result<T> = std::result::Result<T, error::Error>;

use axum::{
    Router,
    extract::State,
    middleware,
    response::IntoResponse,
    routing::{get, post},
};
use axum_reverse_proxy::ReverseProxy;

use crate::auth_session_data::{TokenSessionData};
mod inject_token_from_session;

#[derive(Parser, Debug)]
#[command(author, version, about)]
struct Args {
    /// Path to config file (JSON or YAML)
    //TODO: Change this from env variable to hardcoded
    #[arg(
        short,
        long,
        env = "WORKFLOWS_OIDC_BFF_CONFIG",
        default_value = "config.yaml"
    )]
    config: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let args: Args = Args::try_parse()
        .map_err(|e| anyhow::anyhow!("CLI argument error: {}", e))?;
    let config = Config::from_file(args.config)?;
    let port = config.port;
    let appstate = Arc::new(AppState::new(config).await?);

    // Migration has been removed and its use can be added later if needed

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rust TLS cryptography");

    let router = create_router(appstate);
    serve(router, port).await
}

fn create_router(state: Arc<AppState>) -> Router {
    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        // .with_expiry(Expiry::OnInactivity(Duration::seconds(600)))
        ;

    let proxy: Router<()> =
        ReverseProxy::new("/", "https://staging.workflows.diamond.ac.uk/graphql").into();

    let router = Router::new()
        .fallback_service(proxy)
        .layer(middleware::from_fn_with_state(
            state.clone(),
            inject_token_from_session::inject_token_from_session,
        ))
        .route("/auth/login", get(login::login))
        .route("/auth/callback", get(callback::callback))
        .route("/auth/logout", post(logout))
        .route("/healthcheck", get(healthcheck::healthcheck))
        .layer(session_layer);


    router.with_state(state)
}

async fn serve(router: Router, port: u16) -> Result<()> {
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port)).await?;
    let service = router.into_make_service();
    axum::serve(listener, service)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let mut sigterm: Signal = signal(SignalKind::terminate()).expect("Failed to listen for SIGTERM");
    sigterm.recv().await;
    println!("Shutting Down");
    process::exit(0);
}

/// Logout handler that:
/// 1. Retrieves the user's token from the session (to get subject ID)
/// 2. Deletes the token from the database (so workflows can't use it)
/// 3. Clears the session (so browser requests are no longer authenticated)
async fn logout(
    State(state): State<Arc<AppState>>,
    session: Session,
) -> Result<impl IntoResponse> {
    // Get the token data to find the subject for database deletion
    let token_session_data: Option<TokenSessionData> =
        session.get(TokenSessionData::SESSION_KEY).await
            .map_err(|e| anyhow::anyhow!("Failed to read session: {}", e))?;

    // If we have token data, delete it from the database
    if let Some(token_data) = token_session_data {
        database::delete_token_from_database(
            &state.database_connection,
            &token_data.subject,
        )
        .await?;
    }

    // Clear the entire session (removes both login and token data)
    session.flush().await
        .map_err(|e| anyhow::anyhow!("Failed to flush session: {}", e))?;

    Ok(axum::http::StatusCode::OK)
}

