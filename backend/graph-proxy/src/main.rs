#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]
#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]

/// GraphQL resolvers
mod graphql;
/// S3 client
mod s3client;

use crate::graphql::subscription_integration::GraphQLSubscription;
use async_graphql::{http::GraphiQLSource, SDLExportOptions};
use axum::{
    http::Uri,
    response::Html,
    routing::{get, get_service},
    Router,
};
use clap::Parser;
use graphql::{graphql_handler, root_schema_builder, RootSchema};
use regex::Regex;
use reqwest::Method;
use s3client::{Client, S3Bucket, S3ClientArgs};
use std::{
    fs::File,
    io::Write,
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
};
use telemetry::{setup_telemetry, TelemetryConfig};
use tokio::net::TcpListener;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{info, instrument, Level};
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
    #[arg(long, env = "ARGO_SERVER_URL")]
    argo_server_url: Url,
    /// The URL of the kubernetes API hosting the workflows
    #[arg(long, env = "KUBERNETES_API_URL")]
    kubernetes_api_url: Uri,
    /// The host IP to bind the service to
    #[arg(long, env="HOST", default_value_t=IpAddr::V4(Ipv4Addr::UNSPECIFIED))]
    host: IpAddr,
    /// The port to bind this service to
    #[arg(long, env = "PORT", default_value_t = 80)]
    port: u16,
    /// The endpoint at which the GraphQL API should be served
    #[arg(long, env = "PREFIX_PATH", default_value = "/")]
    prefix_path: String,
    /// Args to setup telemetry
    #[command(flatten)]
    telemetry_config: TelemetryConfig,
    /// Regexes of Cross Origin Resource Sharing (CORS) Origins to allow
    #[arg(long, env="CORS_ALLOW", value_delimiter=' ', num_args=1..)]
    cors_allow: Option<Vec<Regex>>,
    /// The S3 bucket in which artifacts are to be stored in.
    #[arg(long, env)]
    s3_bucket: S3Bucket,
    /// Configuration argument of the S3 client.
    #[command(flatten)]
    s3_client: S3ClientArgs,
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

/// The URL of the kubernetes API
#[derive(Debug, Clone, derive_more::Deref)]
pub struct KubernetesApiUrl(Uri);

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let args = Cli::parse();
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rust TLS cryptography");

    match args {
        Cli::Serve(args) => {
            let _otlp_guard = setup_telemetry(args.telemetry_config.clone()).unwrap();
            info!(?args, "Starting GraphQL Server");
            let s3_client = Client::from(args.s3_client);
            let schema = root_schema_builder()
                .data(ArgoServerUrl(args.argo_server_url))
                .data(KubernetesApiUrl(args.kubernetes_api_url))
                .data(s3_client)
                .data(args.s3_bucket)
                .finish();
            let router = setup_router(schema, &args.prefix_path, args.cors_allow).unwrap();
            serve(router, args.host, args.port).await.unwrap();
        }
        Cli::Schema(args) => {
            setup_telemetry(TelemetryConfig {
                metrics_endpoint: None,
                tracing_endpoint: None,
                telemetry_level: Level::INFO,
            })
            .unwrap();
            info!(?args, "Generating GraphQL schema");
            let schema = root_schema_builder()
                .enable_subscription_in_federation()
                .finish();
            let schema_string = schema.sdl_with_options(SDLExportOptions::new().federation());
            if let Some(path) = args.path {
                let mut file = File::create(&path).unwrap();
                file.write_all(schema_string.as_bytes()).unwrap();
                info!("Schema written to {:#?}", path);
            } else {
                println!("{schema_string}");
            }
        }
    }
}

/// Creates an [`axum::Router`] serving GraphiQL and sychronous GraphQL
#[instrument(name = "graph_proxy_router_setup", skip(schema))]
fn setup_router(
    schema: RootSchema,
    prefix_path: &str,
    cors_allow: Option<Vec<Regex>>,
) -> anyhow::Result<Router> {
    info!("Setting up the router");
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
        info!("CORS rules disabled. Allowing default origin.");
        AllowOrigin::default()
    };
    Ok(Router::new()
        .route(
            prefix_path,
            get(Html(
                GraphiQLSource::build()
                    .endpoint(prefix_path)
                    .subscription_endpoint("/ws")
                    .finish(),
            ))
            .post(graphql_handler)
            .with_state(schema.clone()),
        )
        .route_service("/ws", get_service(GraphQLSubscription::new(schema.clone())))
        .with_state(schema.clone())
        .layer(
            CorsLayer::new()
                .allow_methods([Method::GET, Method::POST])
                .allow_headers(tower_http::cors::Any)
                .allow_origin(cors_origin),
        ))
}

/// Serves the endpoints on the specified host and port forever
async fn serve(router: Router, host: IpAddr, port: u16) -> std::io::Result<()> {
    let socket_addr = SocketAddr::new(host, port);
    let listener = TcpListener::bind(socket_addr).await?;
    info!("Server is running at http://{}", socket_addr);
    axum::serve(listener, router.into_make_service()).await?;
    Ok(())
}
