#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]
#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]

/// GraphQL resolvers
mod graphql;

use async_graphql::{http::GraphiQLSource, ObjectType, SDLExportOptions, Schema, SubscriptionType};
use async_graphql_axum::GraphQL;
use axum::{response::Html, routing::get, Router};
use clap::Parser;
use graphql::root_schema_builder;
use std::{
    fs::File,
    io::Write,
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
};
use tokio::net::TcpListener;

/// A proxy providing Argo Workflows data
#[derive(Debug, Parser)]
enum Cli {
    /// Starts a webserver serving the GraphQL API
    Serve(ServeArgs),
    /// Produces the GraphQL schema
    Schema(SchemaArgs),
}

/// Arguments for serving the GraphQL API
#[derive(Debug, Parser)]
struct ServeArgs {
    /// The host IP to bind the service to
    #[arg(short, long, env="HOST", default_value_t=IpAddr::V4(Ipv4Addr::UNSPECIFIED))]
    host: IpAddr,
    /// The port to bind this service to
    #[arg(short, long, env = "PORT", default_value_t = 80)]
    port: u16,
}

/// Arguments for producing the GraphQL schema
#[derive(Debug, Parser)]
struct SchemaArgs {
    /// The file to write the schema to, if not set the schema will be printed to stdout
    #[arg(short, long)]
    path: Option<PathBuf>,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let args = Cli::parse();

    match args {
        Cli::Serve(args) => {
            let schema = root_schema_builder().finish();
            let router = setup_router(schema);
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
    schema: Schema<
        impl ObjectType + 'static,
        impl ObjectType + 'static,
        impl SubscriptionType + 'static,
    >,
) -> Router {
    #[allow(clippy::missing_docs_in_private_items)]
    const GRAPHQL_ENDPOINT: &str = "/";

    Router::new().route(
        GRAPHQL_ENDPOINT,
        get(Html(
            GraphiQLSource::build().endpoint(GRAPHQL_ENDPOINT).finish(),
        ))
        .post_service(GraphQL::new(schema)),
    )
}

/// Serves the endpoints on the specified host and port forever
async fn serve(router: Router, host: IpAddr, port: u16) -> std::io::Result<()> {
    let socket_addr = SocketAddr::new(host, port);
    let listener = TcpListener::bind(socket_addr).await?;
    axum::serve(listener, router.into_make_service()).await?;
    Ok(())
}
