#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]

use crate::state::RouterState;
use auth_core::error::Error;
use auth_core::healthcheck::healthcheck;
use auth_core::middleware::inject_token;
use auth_core::openidconnect::SubjectIdentifier;

use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    process,
    sync::{Arc, OnceLock},
};

use axum::{Router, http::Method, middleware, routing::get};
use clap::Parser;
use regex::Regex;
use tokio::signal::unix::{SignalKind, signal};

use anyhow::Context;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{debug, info};
use tracing_subscriber::EnvFilter;

mod config;
mod state;

use axum_reverse_proxy::ReverseProxy;
use config::DaemonConfig;
use k8s_openapi::api::core::v1::Pod;
use kube::{
    Api, Client,
    api::{ApiResource, DynamicObject},
    core::GroupVersionKind,
};

type Result<T> = std::result::Result<T, Error>;

static CRYPTO_PROVIDER: OnceLock<()> = OnceLock::new();

async fn resolve_subject() -> anyhow::Result<SubjectIdentifier> {
    let namespace =
        std::fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/namespace")
            .context("failed to read namespace from service account token")?;
    let namespace = namespace.trim();
    let pod_name = std::fs::read_to_string("/etc/hostname")
        .context("failed to read pod name from /etc/hostname")?;
    let pod_name = pod_name.trim();

    let client = Client::try_default()
        .await
        .context("failed to create Kubernetes client (check service account token mount)")?;

    let pods: Api<Pod> = Api::namespaced(client.clone(), namespace);
    let pod = pods
        .get(pod_name)
        .await
        .with_context(|| format!("failed to get pod {}/{}", namespace, pod_name))?;
    let workflow_name = pod
        .metadata
        .labels
        .as_ref()
        .and_then(|l| l.get("workflows.argoproj.io/workflow"))
        .ok_or_else(|| {
            anyhow::anyhow!(
                "label workflows.argoproj.io/workflow missing on pod {}",
                pod_name
            )
        })?
        .clone();

    let gvk = GroupVersionKind::gvk("argoproj.io", "v1alpha1", "Workflow");
    let wf_api = Api::<DynamicObject>::namespaced_with(
        client,
        namespace,
        &ApiResource::from_gvk_with_plural(&gvk, "workflows"),
    );
    let workflow = wf_api
        .get(&workflow_name)
        .await
        .with_context(|| format!("failed to get workflow {}/{}", namespace, workflow_name))?;
    let subject = workflow
        .metadata
        .labels
        .as_ref()
        .and_then(|l| l.get("workflows.argoproj.io/creator"))
        .ok_or_else(|| {
            anyhow::anyhow!(
                "label workflows.argoproj.io/creator missing on workflow {}",
                workflow_name
            )
        })?
        .clone();
    Ok(SubjectIdentifier::new(subject))
}

#[derive(Parser, Debug)]
#[command(author, version, about)]
struct ServeArgs {
    /// Path to config file (JSON or YAML)
    #[arg(
        short,
        long,
        env = "WORKFLOWS_AUTH_DAEMON_CONFIG",
        default_value = "config.yaml"
    )]
    config: String,
}

#[derive(Debug, Parser)]
#[allow(clippy::large_enum_variant)]
enum Cli {
    /// Starts a webserver
    Serve(ServeArgs),
}

#[tokio::main]
async fn main() -> Result<()> {
    // Must be installed before any TLS connection, setup_router duplicates this as a fallback for
    // current or future tests that bypass main
    // OnceLock ensures only one installation of which path is run
    CRYPTO_PROVIDER.get_or_init(|| {
        auth_core::rustls::crypto::aws_lc_rs::default_provider()
            .install_default()
            .expect("Failed to install rustls CryptoProvider");
    });

    dotenvy::dotenv().ok();
    let args = Cli::parse();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_env("LOG_LEVEL"))
        .init();

    match args {
        Cli::Serve(args) => {
            let config = DaemonConfig::from_file(&args.config)
                .map_err(|e| anyhow::anyhow!("failed to read config {}: {:?}", args.config, e))?;
            let requested_port = config.common.port;
            let subject = resolve_subject().await?;
            let router_state = Arc::new(
                RouterState::new(config, &subject)
                    .await
                    .map_err(|e| anyhow::anyhow!("failed to initialise router state: {:?}", e))?,
            );

            let router = setup_router(router_state, None)?;
            serve(router, IpAddr::V4(Ipv4Addr::UNSPECIFIED), requested_port)
                .await
                .with_context(|| format!("failed to bind/serve on port {}", requested_port))?;
        }
    }

    Ok(())
}

fn setup_router(state: Arc<RouterState>, cors_allow: Option<Vec<Regex>>) -> anyhow::Result<Router> {
    debug!("Setting up the router");

    CRYPTO_PROVIDER.get_or_init(|| {
        auth_core::rustls::crypto::aws_lc_rs::default_provider()
            .install_default()
            .expect("Failed to install rustls CryptoProvider");
    });

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

    let proxy: Router<Arc<RouterState>> =
        ReverseProxy::new("/", state.config.graph_url.as_str()).into();
    let proxy = proxy;

    Ok(proxy
        .layer(middleware::from_fn_with_state(
            state.clone(),
            inject_token::inject_token,
        ))
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_methods([Method::GET, Method::POST])
                .allow_headers(tower_http::cors::Any)
                .allow_origin(cors_origin),
        )
        .route("/healthz", get(healthcheck)))
}

async fn serve(router: Router, host: IpAddr, port: u16) -> std::io::Result<()> {
    let socket_addr = SocketAddr::new(host, port);
    let listener = tokio::net::TcpListener::bind(socket_addr).await?;
    debug!("Server is running at http://{}", socket_addr);
    axum::serve(listener, router.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let mut sigterm = signal(SignalKind::terminate()).expect("Failed to listen for SIGTERM");
    sigterm.recv().await;
    println!("Shutting down");
    process::exit(0);
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::time::Duration;

    use auth_core::openidconnect::SubjectIdentifier;
    use auth_core::sea_orm::ActiveValue::Set;
    use auth_core::sea_orm::{Database, DatabaseConnection, EntityTrait};
    use mockito::Matcher;
    use serde_json::json;
    use testcontainers::core::wait::HttpWaitStrategy;
    use testcontainers::{GenericImage, ImageExt};
    use testcontainers::{core::WaitFor, runners::AsyncRunner};

    use auth_core::base64::{Engine, engine::general_purpose::STANDARD as BASE64};

    use crate::{Result, setup_router};
    use crate::{config::DaemonConfig, state::RouterState};

    async fn test_database(issuer_url: &str, refresh_token: &str) -> Result<DatabaseConnection> {
        let db = Database::connect("sqlite::memory:").await?;
        use migration::{Migrator, MigratorTrait};
        Migrator::up(&db, None).await?;

        let now: chrono::DateTime<chrono::FixedOffset> = chrono::Utc::now().into();
        let expires_at = now + Duration::from_secs(600);

        let public_key = auth_core::sodiumoxide::crypto::box_::PublicKey::from_slice(
            &BASE64.decode("ZpJ703xR7atXbGXI20FkQk3J1qjLxodTP6yk92yPVGM=")?,
        )
        .expect("valid key");
        let encrypted_refresh_token =
            auth_core::sodiumoxide::crypto::sealedbox::seal(refresh_token.as_bytes(), &public_key);

        auth_core::entity::oidc_tokens::Entity::insert(
            auth_core::entity::oidc_tokens::ActiveModel {
                issuer: Set(issuer_url.into()),
                subject: Set("test-subject".to_string()),
                encrypted_refresh_token: Set(encrypted_refresh_token),
                expires_at: Set(Some(expires_at)),
                created_at: Set(now),
                updated_at: Set(now),
            },
        )
        .exec(&db)
        .await?;

        Ok(db)
    }

    #[tokio::test]
    async fn test() -> Result<()> {
        let _ = env_logger::try_init();

        let mut graphql_server = mockito::Server::new_async().await;
        let graphql_server_url = graphql_server.url();
        let graphql_mock = graphql_server
            .mock("POST", "/")
            .match_header("Authorization", Matcher::Regex("Bearer .+".into()))
            .with_status(200)
            .with_body("{\"name\": \"workflow-name\"}")
            .expect(1)
            .create_async()
            .await;

        let wait_strategy = HttpWaitStrategy::new("default/.well-known/openid-configuration")
            .with_expected_status_code(200u16);
        let oidc_container = GenericImage::new("ghcr.io/navikt/mock-oauth2-server", "3.0.1")
            .with_wait_for(WaitFor::http(wait_strategy))
            .with_env_var("SERVER_PORT", "8080")
            .with_startup_timeout(Duration::from_secs(60))
            .start()
            .await
            .expect("failed to start mock OIDC server");
        let port = oidc_container.get_host_port_ipv4(8080).await?;

        let mock_admin_url = format!("http://localhost:{}/default/token", port);
        let params = [
            ("grant_type", "refresh_token"),
            ("scope", "openid offline_access"),
            ("refresh_token", "test-refresh-token"),
            ("client_id", "test-client"),
        ];

        let res: serde_json::Value = reqwest::Client::new()
            .post(mock_admin_url)
            .timeout(Duration::from_secs(10))
            .form(&params)
            .send()
            .await?
            .json()
            .await?;

        // println!("RESPONSE: {:?}", res.to_string());

        let refresh_token = res["refresh_token"].as_str().expect("no refresh token");

        let issuer_url = format!("http://localhost:{}/default", port);

        let db = test_database(&issuer_url, refresh_token).await?;

        let config = DaemonConfig {
            common: auth_core::config::CommonConfig {
                client_id: "test-client".into(),
                client_secret: "".into(),
                oidc_provider_url: issuer_url,
                port: 6000,
                postgres_user: "auth_user".into(),
                postgres_password: "password".into(),
                postgres_database: "auth_service".into(),
                postgres_hostname: "database-hostname".into(),
                postgres_port: 5432,
                encryption_public_key: "ZpJ703xR7atXbGXI20FkQk3J1qjLxodTP6yk92yPVGM=".into(),
            },
            graph_url: graphql_server_url,
            encryption_private_key: "yxjSYB/nvdAzktd83diOtADvp3RX/0Kx5V3FgK7YlXk=".into(),
        };

        let router_state = Arc::new(
            RouterState::with_database(config, &SubjectIdentifier::new("test-subject".into()), db)
                .await?,
        );
        let router = setup_router(router_state, None)?;
        let test_server = axum_test::TestServer::new(router)?;

        //
        let response = test_server.post("/").content_type("application/json").json(&json!(
            {"query": "mutation{ submitWorkflowTemplate(name: \"template-name\", visit: {proposalCode: \"xy\", proposalNumber: 1234, number: 5}, parameters: {}){ name } }" }
        )).await;

        response.assert_status_ok();
        graphql_mock.assert_async().await;

        oidc_container.stop_with_timeout(Some(60)).await?;

        Ok(())
    }
}
