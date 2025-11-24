mod config;
use clap::Parser;
use config::Config;
use tower_sessions::{MemoryStore, Session, SessionManagerLayer};
mod login;
use std::{
    net::{Ipv4Addr, SocketAddr},
    sync::Arc,
};
mod auth_session_data;
mod state;
use state::AppState;
mod callback;
mod counter;
mod error;

type Result<T> = std::result::Result<T, error::Error>;

use axum::{
    Json, Router,
    extract::State,
    middleware,
    response::IntoResponse,
    routing::{get, post},
};
use axum_reverse_proxy::ReverseProxy;

use crate::auth_session_data::{LoginSessionData, TokenSessionData};
mod inject_token_from_session;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let config: Config = Config::parse();
    let port = config.port;
    let appstate = Arc::new(AppState::new(config).await?);

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
    let proxy = proxy;

    Router::new()
        .nest_service("/api", proxy)
        .layer(middleware::from_fn_with_state(
            state.clone(),
            inject_token_from_session::inject_token_from_session,
        ))
        .route("/auth/login", get(login::login))
        .route("/read", get(counter::counter_read))
        .route("/write", get(counter::counter_write))
        .route("/auth/callback", get(callback::callback))
        .route("/auth/logout", post(logout))
        .route("/debug", get(debug))
        .layer(session_layer)
        .with_state(state)
}

async fn serve(router: Router, port: u16) -> Result<()> {
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port)).await?;
    let service = router.into_make_service();
    axum::serve(listener, service).await?;
    Ok(())
}

async fn logout() {}

async fn debug(State(state): State<Arc<AppState>>, session: Session) -> Result<impl IntoResponse> {
    let auth_session_data: Option<LoginSessionData> =
        session.get(LoginSessionData::SESSION_KEY).await?;

    let token_session_data: Option<TokenSessionData> =
        session.get(TokenSessionData::SESSION_KEY).await?;

    Ok(Json((
        state.config.clone(),
        auth_session_data,
        token_session_data,
    )))
}
