mod login;
use std::net::{Ipv4Addr, SocketAddr};

use axum::{
    Router,
    http::Method,
    routing::{MethodFilter, get, on, post},
};
use axum_reverse_proxy::ReverseProxy;

#[tokio::main]
async fn main() {
    println!("Hello, world!");
    let router = create_router();
    serve(router);
}

fn create_router() -> Router<()> {
    let proxy: Router<()> = ReverseProxy::new("/api", "https://httpbin.org").into();
    let router: Router<()> = proxy
    .route("/auth/login", get(login::login))
    .route("/auth/callback", get(callback))
    .route("/auth/logout", post(logout))
    //.route("/api/*", on(MethodFilter::GET.or( MethodFilter::POST).or( MethodFilter::PUT).or( MethodFilter::DELETE), api));
    ;
    return router;
}

async fn serve(router: Router<()>) -> anyhow::Result<()> {
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
