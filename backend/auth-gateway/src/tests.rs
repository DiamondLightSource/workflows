use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use auth_core::base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use auth_core::config::CommonConfig;
use auth_core::oidc::create_oidc_client;
use auth_core::sea_orm::Database;
use axum::http::{StatusCode, header};
use axum_test::TestServer;
use mockito::{Matcher, Server};
use serde_json::json;
use testcontainers::core::wait::HttpWaitStrategy;
use testcontainers::runners::AsyncRunner;
use testcontainers::{GenericImage, ImageExt, core::WaitFor};
use tokio::time::sleep;
use tower_sessions::cookie::SameSite;
use tower_sessions::cookie::time::Duration as TimeDuration;
use tower_sessions::{Expiry, MemoryStore};
use url::Url;

use crate::create_router;
use crate::state::AppState;

const TEST_PUBLIC_KEY_B64: &str = "4bpkg3AnhFtQ7JzobU37kSU+EbJkkQj+jApMzmH40HI=";
const TEST_SUBJECT: &str = "test-subject";

fn test_common_config(oidc_provider_url: String) -> CommonConfig {
    CommonConfig {
        client_id: "test-client".to_string(),
        client_secret: "test-secret".to_string(),
        oidc_provider_url,
        port: 0,
        postgres_user: "user".to_string(),
        postgres_password: "password".to_string(),
        postgres_database: "auth".to_string(),
        postgres_hostname: "localhost".to_string(),
        postgres_port: 5432,
        encryption_public_key: TEST_PUBLIC_KEY_B64.to_string(),
        cors_allow: None,
    }
}

async fn test_app_state(oidc_provider_url: &str) -> Arc<AppState> {
    auth_core::rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .ok();

    let db = Database::connect("sqlite::memory:")
        .await
        .expect("connect to in-memory sqlite");
    <migration::Migrator as migration::MigratorTrait>::up(&db, None)
        .await
        .expect("run database migrations");

    let config = test_common_config(oidc_provider_url.to_string());
    let (oidc_client, http_client) = create_oidc_client(&config)
        .await
        .expect("create oidc client");

    let public_key = auth_core::sodiumoxide::crypto::box_::PublicKey::from_slice(
        &BASE64
            .decode(TEST_PUBLIC_KEY_B64)
            .expect("decode test public key"),
    )
    .expect("valid test public key");

    Arc::new(AppState {
        http_client,
        oidc_client,
        database_connection: db,
        public_key,
        callback_url: "http://localhost/auth/callback".to_string(),
        callback_default_return_to_url: "http://localhost/dashboard".to_string(),
        cors_allow: None,
        session_secure: false,
    })
}

fn test_server_with(
    state: Arc<AppState>,
    graph_url: String,
    store: MemoryStore,
    session_expiry: Expiry,
) -> TestServer {
    TestServer::builder()
        .save_cookies()
        .build(create_router(
            state,
            graph_url,
            SameSite::Strict,
            store,
            session_expiry,
        ))
        .expect("build test server")
}

fn mock_graph(server: &mut Server) {
    server
        .mock("GET", Matcher::Any)
        .with_status(200)
        .with_body("{}")
        .create();
}

async fn start_mock_oidc() -> (testcontainers::ContainerAsync<GenericImage>, String) {
    let config = json!({
        "interactiveLogin": false,
        "tokenCallbacks": [{
            "issuerId": "default",
            "tokenExpiry": 600,
            "requestMappings": [{
                "requestParam": "code",
                "match": "*",
                "claims": {
                    "sub": TEST_SUBJECT,
                    "aud": ["test-client"],
                    "name": "Test User",
                    "preferred_username": "testuser",
                    "fedid": "fedid-123"
                }
            }]
        }]
    })
    .to_string();

    let wait_strategy = HttpWaitStrategy::new("default/.well-known/openid-configuration")
        .with_expected_status_code(200u16);
    let container = GenericImage::new("ghcr.io/navikt/mock-oauth2-server", "3.0.1")
        .with_wait_for(WaitFor::http(wait_strategy))
        .with_env_var("SERVER_PORT", "8080")
        .with_env_var("JSON_CONFIG", config)
        .start()
        .await
        .expect("failed to start mock OIDC server");
    let port = container
        .get_host_port_ipv4(8080)
        .await
        .expect("get OIDC container host port");
    let issuer_url = format!("http://localhost:{port}/default");
    (container, issuer_url)
}

async fn authenticate(server: &mut TestServer) {
    let login = server.get("/auth/login").await;
    login.assert_status(StatusCode::TEMPORARY_REDIRECT);
    let authorize_url = login
        .headers()
        .get(header::LOCATION)
        .expect("login redirect location")
        .to_str()
        .expect("location is utf-8")
        .to_string();

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("build reqwest client");
    let authorize = client
        .get(authorize_url)
        .send()
        .await
        .expect("request authorize endpoint")
        .error_for_status()
        .expect("authorize endpoint succeeded");
    let redirect_to = authorize
        .headers()
        .get(header::LOCATION)
        .expect("authorize redirect location")
        .to_str()
        .expect("location is utf-8");

    let params: HashMap<String, String> = Url::parse(redirect_to)
        .expect("parse redirect URL")
        .query_pairs()
        .into_owned()
        .collect();
    let code = params.get("code").expect("authorization code").clone();
    let state = params.get("state").expect("oauth state").clone();

    server
        .get(&format!("/auth/callback?code={code}&state={state}"))
        .await
        .assert_status(StatusCode::TEMPORARY_REDIRECT);
}

#[tokio::test]
async fn session_expires_after_inactivity_timeout() -> anyhow::Result<()> {
    if std::env::var("WORKFLOWS_DEV_CONTAINER").is_ok() {
        eprintln!("Skipping test: test containers don't work inside VSCode dev container");
        return Ok(());
    }

    const TIMEOUT_SECS: u64 = 3;

    let (_oidc, issuer) = start_mock_oidc().await;
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state,
        "http://graph.invalid".to_string(),
        MemoryStore::default(),
        Expiry::OnInactivity(TimeDuration::seconds(TIMEOUT_SECS as i64)),
    );

    authenticate(&mut server).await;

    server.get("/auth/me").await.assert_status_ok();

    // Wait for inactivity timeout
    sleep(Duration::from_secs(TIMEOUT_SECS + 2)).await;

    server.get("/auth/me").await.assert_status_unauthorized();

    Ok(())
}

#[tokio::test]
async fn session_kept_alive_by_api_activity() -> anyhow::Result<()> {
    if std::env::var("WORKFLOWS_DEV_CONTAINER").is_ok() {
        eprintln!("Skipping test: test containers don't work inside VSCode dev container");
        return Ok(());
    }

    const TIMEOUT_SECS: u64 = 4;
    const ACTIVITY_SECS: u64 = TIMEOUT_SECS / 2;

    let (_oidc, issuer) = start_mock_oidc().await;
    let mut graph = Server::new_async().await;
    mock_graph(&mut graph);
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state,
        graph.url(),
        MemoryStore::default(),
        Expiry::OnInactivity(TimeDuration::seconds(TIMEOUT_SECS as i64)),
    );

    authenticate(&mut server).await;

    // Simulate user activity
    sleep(Duration::from_secs(ACTIVITY_SECS)).await;
    server.get("/api/health").await.assert_status_ok();

    // The user is still logged in after more than the original timeout
    sleep(Duration::from_secs(TIMEOUT_SECS + 1 - ACTIVITY_SECS)).await;
    server.get("/auth/me").await.assert_status_ok();

    Ok(())
}
