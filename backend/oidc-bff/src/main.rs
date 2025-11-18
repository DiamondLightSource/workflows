mod config;
use clap::Parser;
use config::Config;
use tower_sessions::{Expiry, MemoryStore, SessionManagerLayer, cookie::time::Duration};
mod login;
use std::net::{Ipv4Addr, SocketAddr};
mod auth_session_data;
mod state;
use state::AppState;
mod callback;
mod counter;
mod error;

type Result<T> = std::result::Result<T, error::Error>;

use axum::{
    Router,
    routing::{get, post},
};
use axum_reverse_proxy::ReverseProxy;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let config: Config = Config::parse();
    let port = config.port;
    let appstate = AppState::new(config);
    let router = create_router(appstate);
    serve(router, port).await
}

fn create_router(state: AppState) -> Router {
    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        // .with_expiry(Expiry::OnInactivity(Duration::seconds(600)))
        ;

    // let proxy: Router<AppState> = ReverseProxy::new("/api", "https://httpbin.org").into();
    let router = Router::new() //proxy
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
