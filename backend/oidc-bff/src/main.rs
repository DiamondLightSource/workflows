mod config;
use clap::Parser;
use config::Config;
use openidconnect::{AccessToken, RefreshToken};
use tower_sessions::{Expiry, MemoryStore, Session, SessionManagerLayer, cookie::time::Duration};
mod login;
use std::net::{Ipv4Addr, SocketAddr};
mod auth_session_data;
mod state;
use state::AppState;
mod api;
mod callback;
mod counter;
mod error;

type Result<T> = std::result::Result<T, error::Error>;

use axum::{
    Router,
    body::Body,
    debug_handler,
    extract::Request,
    http::{self, HeaderValue},
    middleware,
    routing::{get, post},
};
use axum_reverse_proxy::ReverseProxy;

use crate::auth_session_data::AuthSessionData;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let config: Config = Config::parse();
    let port = config.port;
    let appstate = AppState::new(config);

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rust TLS cryptography");

    let router = create_router(appstate);
    serve(router, port).await
}

fn create_router(state: AppState) -> Router {
    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        // .with_expiry(Expiry::OnInactivity(Duration::seconds(600)))
        ;

    let proxy: Router<()> =
        ReverseProxy::new("/", "https://workflows.diamond.ac.uk/graphql").into();
    let proxy = proxy;
    let router = Router::new()
        .nest_service("/api", proxy)
        .route_layer(middleware::from_fn(inject_token_from_session))
        .route("/auth/login", get(login::login))
        .route("/read", get(counter::counter_read))
        .route("/write", get(counter::counter_write))
        .route("/auth/callback", get(callback::callback))
        .route("/auth/logout", post(logout))
        .layer(session_layer);
    let router: Router = router.with_state(state);
    return router;
}

async fn serve(router: Router, port: u16) -> Result<()> {
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port)).await?;
    let service = router.into_make_service();
    axum::serve(listener, service).await?;
    Ok(())
}

async fn logout() {}

async fn inject_token_from_session(
    mut req: Request,
    next: middleware::Next,
) -> axum::response::Response {
    // Extract the session from request extensions
    let session = req
        .extensions()
        .get::<Session>()
        .expect("Session extension missing")
        .clone();

    // Read token from session
    let token: Option<AccessToken> = session
        .get(AuthSessionData::ACCESS_TOKEN_KEY)
        .await
        .ok()
        .flatten();

    if let Some(token) = token {

        // token = refresh_token(token);

        let value = format!("Bearer {}", token.secret());
        req.headers_mut().insert(
            http::header::AUTHORIZATION,
            HeaderValue::from_str(&value).unwrap(),
        );
    }

    next.run(req).await
}

async fn refresh_token(token: AccessToken, refresh_token: RefreshToken) {
    
}