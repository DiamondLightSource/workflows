#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]

mod proxy;
use proxy::proxy;

mod healthcheck;
use healthcheck::healthcheck;

use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    sync::Arc,
};

use axum::{
    Router,
    http::Method,
    routing::{get, post},
};
use clap::Parser;
use regex::Regex;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{debug, info};
use tracing_subscriber::EnvFilter;
use url::Url;

#[derive(Debug, Parser)]
#[allow(clippy::large_enum_variant)]
enum Cli {
    /// Starts a webserver
    Serve(RouterState),
}

#[derive(Debug, Parser)]
struct RouterState {
    #[arg(short, long, env = "AUTH_DOMAIN")]
    auth_domain: Url,
    #[arg(short, long, env = "CLIENT_ID")]
    client_id: String,
    #[arg(short, long, env = "GRAPH_URL")]
    graph_url: Url,
    #[arg(short, long, env = "TOKEN")]
    token: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let args = Cli::parse();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_env("LOG_LEVEL"))
        .init();

    match args {
        Cli::Serve(args) => {
            let router_state = Arc::new(args);

            let router = setup_router(router_state, None)?;
            serve(router, IpAddr::V4(Ipv4Addr::UNSPECIFIED), 3000).await?;
        }
    }

    Ok(())
}

fn setup_router(state: Arc<RouterState>, cors_allow: Option<Vec<Regex>>) -> anyhow::Result<Router> {
    debug!("Setting up the router");
    let cors_origin = if let Some(cors_allow) = cors_allow {
        info!("Allowing CORS Origin(s) matching: {:?}", cors_allow);
        AllowOrigin::predicate(move |origin, _| {
            origin.to_str().is_ok_and(|origin| {
                cors_allow
                    .iter()
                    .any(|cors_allow| cors_allow.is_match(origin))
            })
        })
    } else {
        debug!("CORS rules disabled. Allowing default origin.");
        AllowOrigin::default()
    };

    Ok(Router::new()
        .route("/", post(proxy))
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_methods([Method::GET, Method::POST])
                .allow_headers(tower_http::cors::Any)
                .allow_origin(cors_origin),
        )
        .route("healthz", get(healthcheck)))
}

async fn serve(router: Router, host: IpAddr, port: u16) -> std::io::Result<()> {
    let socket_addr = SocketAddr::new(host, port);
    let listener = tokio::net::TcpListener::bind(socket_addr).await?;
    debug!("Server is running at http://{}", socket_addr);
    axum::serve(listener, router.into_make_service()).await?;
    Ok(())
}
