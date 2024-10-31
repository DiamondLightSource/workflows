#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]
#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]

/// GraphQL resolvers
mod graphql;
/// OpenTelemetry setup and configuration
mod telemetry;

use async_graphql::{http::GraphiQLSource, SDLExportOptions};
use axum::{response::Html, routing::get, Router};
use clap::Parser;
use graphql::{graphql_handler, root_schema_builder, RootSchema};
use regex::Regex;
use reqwest::Method;
use std::{
    fs::File,
    io::Write,
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
};
use telemetry::setup_telemetry;
use tokio::net::TcpListener;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{info, Level};
use url::Url;

/// A proxy providing Argo Workflows data
#[derive(Debug, Parser)]
#[allow(clippy::large_enum_variant)]
enum Cli {
    /// Starts a webserver serving the GraphQL API
    Serve(ServeArgs),
    /// Produces the GraphQL schema
    Schema(SchemaArgs),
}

/// Arguments for serving the GraphQL API
#[derive(Debug, Parser)]
struct ServeArgs {
    /// The base URL of the Argo Server from which data is to be retrieved
    #[arg(short, long, env = "ARGO_SERVER_URL")]
    argo_server_url: Url,
    /// The host IP to bind the service to
    #[arg(short, long, env="HOST", default_value_t=IpAddr::V4(Ipv4Addr::UNSPECIFIED))]
    host: IpAddr,
    /// The port to bind this service to
    #[arg(short, long, env = "PORT", default_value_t = 80)]
    port: u16,
    /// The endpoint at which the GraphQL API should be served
    #[arg(long, env = "PREFIX_PATH", default_value = "/")]
    prefix_path: String,
    /// The endpoint to send OTLP metrics to
    #[arg(short, long, env = "METRICS_ENDPOINT")]
    metrics_endpoint: Option<Url>,
    /// The endpoint to send OTLP traces to
    #[arg(short, long, env = "TRACING_ENDPOINT")]
    tracing_endpoint: Option<Url>,
    /// The minimum telemetry level
    #[arg(short, long, env="TELEMETRY_LEVEL", default_value_t=Level::INFO)]
    telemetry_level: Level,
    /// Regexes of Cross Origin Resource Sharing (CORS) Origins to allow
    #[arg(long, env="CORS_ALLOW", value_delimiter=' ', num_args=1..)]
    cors_allow: Option<Vec<Regex>>,
}

/// Arguments for producing the GraphQL schema
#[derive(Debug, Parser)]
struct SchemaArgs {
    /// The file to write the schema to, if not set the schema will be printed to stdout
    #[arg(short, long)]
    path: Option<PathBuf>,
}

/// The URL of an Argo Server
#[derive(Debug, Clone, derive_more::Deref)]
pub struct ArgoServerUrl(Url);

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let args = Cli::parse();

    match args {
        Cli::Serve(args) => {
            setup_telemetry(
                args.metrics_endpoint,
                args.tracing_endpoint,
                args.telemetry_level,
            )
            .unwrap();
            let schema = root_schema_builder()
                .data(ArgoServerUrl(args.argo_server_url))
                .finish();
            let router = setup_router(schema, &args.prefix_path, args.cors_allow).unwrap();
            serve(router, args.host, args.port).await.unwrap();
        }
        Cli::Schema(args) => {
            let schema = root_schema_builder().finish();
            let schema_string = schema.sdl_with_options(SDLExportOptions::new().federation());
            if let Some(path) = args.path {
                let mut file = File::create(path).unwrap();
                file.write_all(schema_string.as_bytes()).unwrap();
            } else {
                println!("{}", schema_string);
            }
        }
    }
}

/// Creates an [`axum::Router`] serving GraphiQL and sychronous GraphQL
fn setup_router(
    schema: RootSchema,
    prefix_path: &str,
    cors_allow: Option<Vec<Regex>>,
) -> anyhow::Result<Router> {
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
        AllowOrigin::default()
    };
    Ok(Router::new()
        .route(
            prefix_path,
            get(Html(GraphiQLSource::build().endpoint(prefix_path).finish()))
                .post(graphql_handler)
                .with_state(schema),
        )
        .layer(
            CorsLayer::new()
                .allow_methods([Method::GET, Method::POST])
                .allow_origin(cors_origin),
        ))
}

/// Serves the endpoints on the specified host and port forever
async fn serve(router: Router, host: IpAddr, port: u16) -> std::io::Result<()> {
    let socket_addr = SocketAddr::new(host, port);
    let listener = TcpListener::bind(socket_addr).await?;
    axum::serve(listener, router.into_make_service()).await?;
    Ok(())
}
