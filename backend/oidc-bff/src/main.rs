mod config;
use clap::Parser;
use config::Config;
mod login;
use std::net::{Ipv4Addr, SocketAddr};
mod session;
mod state;
use state::AppState;
mod callback;

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
    serve(router);
}

fn create_router(state: AppState) -> Router<AppState> {
    let proxy: Router<AppState> = ReverseProxy::new("/api", "https://httpbin.org").into();
    let router: Router<AppState> = proxy
        .with_state(state)
        .route("/auth/login", get(login::login))
        .route("/auth/callback", get(callback::callback))
        .route("/auth/logout", post(logout));
    return router;
}

async fn serve(router: Router<AppState>) -> anyhow::Result<()> {
    let port = 80;
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port))
            .await
            .unwrap();
    axum::serve(listener, router).await?;
    Ok(())
}

async fn callback() {}

async fn logout() {}

async fn api() {}
