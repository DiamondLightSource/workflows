mod config;
use clap::Parser;
use config::Config;
mod login;
use std::net::{Ipv4Addr, SocketAddr};
mod session;
mod state;
use state::AppState;
mod callback;
mod error;

type Result<T> = std::result::Result<T, error::Error>;

use axum::{
    Router,
    routing::{get, post},
};
use axum_reverse_proxy::ReverseProxy;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let config: Config = Config::parse();
    let appstate = AppState::new(config);
    let router = create_router(appstate);
    let _ = serve(router).await;
}

fn create_router(state: AppState) -> Router {
    let proxy: Router<AppState> = ReverseProxy::new("/api", "https://httpbin.org").into();
    let router = proxy
        .route("/auth/login", get(login::login))
        .route("/auth/callback", get(callback::callback))
        .route("/auth/logout", post(logout));
    let router: Router = router.with_state(state);
    return router;
}

async fn serve(router: Router) -> anyhow::Result<()> {
    let port = 80;
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port))
            .await
            .unwrap();
    let service = router.into_make_service();
    axum::serve(listener, service).await?;
    Ok(())
}

async fn logout() {}
