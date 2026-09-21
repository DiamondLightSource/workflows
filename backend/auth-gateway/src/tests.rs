use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use auth_core::base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use auth_core::config::CommonConfig;
use auth_core::entity::oidc_tokens;
use auth_core::oidc::create_oidc_client;
use auth_core::sea_orm::{ColumnTrait, Database, EntityTrait, PaginatorTrait, QueryFilter};
use axum::http::{StatusCode, header};
use axum_test::TestServer;
use mockito::{Matcher, Server};
use regex::Regex;
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

fn skip_in_dev_container() -> bool {
    if std::env::var("WORKFLOWS_DEV_CONTAINER").is_ok() {
        eprintln!("Skipping test: test containers don't work inside VSCode dev container");
        return true;
    }
    false
}

fn init_test() {
    auth_core::rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .ok();
}

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
    test_app_state_with(oidc_provider_url, None).await
}

async fn test_app_state_with(
    oidc_provider_url: &str,
    cors_allow: Option<Vec<Regex>>,
) -> Arc<AppState> {
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
        cors_allow,
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

fn mock_graph_capturing_bearer(server: &mut Server) -> Arc<Mutex<Option<String>>> {
    let captured = Arc::new(Mutex::new(None));
    let captured_for_mock = captured.clone();
    server
        .mock("GET", Matcher::Any)
        .with_status(200)
        .with_body_from_request(move |req| {
            let bearer = req
                .headers()
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_string);
            *captured_for_mock.lock().unwrap() = bearer;
            b"{}".to_vec()
        })
        .create();
    captured
}

async fn start_mock_oidc() -> (testcontainers::ContainerAsync<GenericImage>, String) {
    start_mock_oidc_with_expiry(600).await
}

async fn start_mock_oidc_with_expiry(
    token_expiry: u64,
) -> (testcontainers::ContainerAsync<GenericImage>, String) {
    let config = json!({
        "interactiveLogin": false,
        "tokenCallbacks": [{
            "issuerId": "default",
            "tokenExpiry": token_expiry,
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
            }, {
                "requestParam": "refresh_token",
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
    run_login_flow(server, None).await;
}

async fn authenticate_with_return_to(server: &mut TestServer, return_to: &str) -> String {
    run_login_flow(server, Some(return_to)).await
}

async fn run_login_flow(server: &mut TestServer, return_to: Option<&str>) -> String {
    let (code, state) = login_and_get_auth_code(server, return_to).await;
    let resp = server
        .get(&format!("/auth/callback?code={code}&state={state}"))
        .await;
    resp.assert_status(StatusCode::TEMPORARY_REDIRECT);
    resp.headers()
        .get(header::LOCATION)
        .expect("callback redirect location")
        .to_str()
        .expect("location is utf-8")
        .to_string()
}

async fn login_and_get_auth_code(
    server: &mut TestServer,
    return_to: Option<&str>,
) -> (String, String) {
    let login_url = match return_to {
        Some(return_to) => {
            let query = url::form_urlencoded::Serializer::new(String::new())
                .append_pair("returnTo", return_to)
                .finish();
            format!("/auth/login?{query}")
        }
        None => "/auth/login".to_string(),
    };

    let login = server.get(&login_url).await;
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
    (code, state)
}

fn inactivity_expiry(secs: u64) -> Expiry {
    Expiry::OnInactivity(TimeDuration::seconds(secs as i64))
}

#[tokio::test]
async fn session_expires_after_inactivity_timeout() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    const TIMEOUT_SECS: u64 = 3;

    let (_oidc, issuer) = start_mock_oidc().await;
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state,
        "http://graph.invalid".to_string(),
        MemoryStore::default(),
        inactivity_expiry(TIMEOUT_SECS),
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
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

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
        inactivity_expiry(TIMEOUT_SECS),
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

#[tokio::test]
async fn unauthenticated_requests_are_rejected() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    let (_oidc, issuer) = start_mock_oidc().await;
    let mut graph = Server::new_async().await;
    mock_graph(&mut graph);
    let state = test_app_state(&issuer).await;
    let server = test_server_with(
        state,
        graph.url(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    // No session / token present
    server.get("/auth/me").await.assert_status_unauthorized();

    // The proxy refuses unauthenticated requests before reaching the graph
    server.get("/api/health").await.assert_status_unauthorized();

    // Health-check does not require authentication
    server
        .get("/healthcheck")
        .await
        .assert_status(StatusCode::ACCEPTED);

    Ok(())
}

#[tokio::test]
async fn bearer_token_injected_into_proxied_graph_requests() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    let (_oidc, issuer) = start_mock_oidc().await;
    let mut graph = Server::new_async().await;
    let captured = mock_graph_capturing_bearer(&mut graph);
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state,
        graph.url(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    authenticate(&mut server).await;

    server.get("/api/health").await.assert_status_ok();

    let bearer = captured
        .lock()
        .unwrap()
        .clone()
        .expect("proxied request should carry an Authorization header");
    assert!(
        bearer.starts_with("Bearer "),
        "expected a Bearer token, got: {bearer}"
    );
    assert!(bearer.len() > "Bearer ".len(), "token should not be empty");

    Ok(())
}

#[tokio::test]
async fn userinfo_returns_logged_in_user_profile() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    let (_oidc, issuer) = start_mock_oidc().await;
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state,
        "http://graph.invalid".to_string(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    authenticate(&mut server).await;

    let resp = server.get("/auth/me").await;
    resp.assert_status(StatusCode::OK);
    let body = resp.json::<serde_json::Value>();
    assert_eq!(body["name"], "Test User");
    assert_eq!(body["preferred_username"], "testuser");
    assert_eq!(body["fedid"], "fedid-123");

    Ok(())
}

#[tokio::test]
async fn logout_revokes_token_and_clears_session() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    let (_oidc, issuer) = start_mock_oidc().await;
    let mut graph = Server::new_async().await;
    mock_graph(&mut graph);
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state.clone(),
        graph.url(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    authenticate(&mut server).await;
    server.get("/auth/me").await.assert_status_ok();

    let count = oidc_tokens::Entity::find()
        .filter(oidc_tokens::Column::Subject.eq(TEST_SUBJECT.to_string()))
        .count(&state.database_connection)
        .await?;
    assert_eq!(count, 1, "expected a stored token before logout");

    server.post("/auth/logout").await.assert_status_ok();

    // Session is cleared
    server.get("/auth/me").await.assert_status_unauthorized();

    // Token revoked from the database
    let count = oidc_tokens::Entity::find()
        .filter(oidc_tokens::Column::Subject.eq(TEST_SUBJECT.to_string()))
        .count(&state.database_connection)
        .await?;
    assert_eq!(count, 0, "expected the token to be revoked after logout");

    Ok(())
}

#[tokio::test]
async fn expired_access_token_is_refreshed() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    const TOKEN_EXPIRY_SECS: u64 = 2;

    let (_oidc, issuer) = start_mock_oidc_with_expiry(TOKEN_EXPIRY_SECS).await;
    let mut graph = Server::new_async().await;
    let captured = mock_graph_capturing_bearer(&mut graph);
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state,
        graph.url(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    authenticate(&mut server).await;

    // First proxied request with a fresh access token
    server.get("/api/health").await.assert_status_ok();
    let first = captured
        .lock()
        .unwrap()
        .clone()
        .expect("first proxied request should carry a bearer token");

    // Wait for the access token to expire
    sleep(Duration::from_secs(TOKEN_EXPIRY_SECS + 2)).await;

    // Next request should refresh and use a new token
    server.get("/api/health").await.assert_status_ok();
    let second = captured
        .lock()
        .unwrap()
        .clone()
        .expect("second proxied request should carry a bearer token");

    assert!(
        first.starts_with("Bearer ") && second.starts_with("Bearer "),
        "both requests should carry bearer tokens"
    );
    assert_ne!(
        first, second,
        "expected the access token to be refreshed after expiry"
    );

    Ok(())
}

#[tokio::test]
async fn status_reflects_token_presence() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    let (_oidc, issuer) = start_mock_oidc().await;
    let mut graph = Server::new_async().await;
    let captured = mock_graph_capturing_bearer(&mut graph);
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state.clone(),
        graph.url(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    authenticate(&mut server).await;

    // Capture the access token the gateway injects into a proxied request
    server.get("/api/health").await.assert_status_ok();
    let auth_value = captured
        .lock()
        .unwrap()
        .clone()
        .expect("proxied request should carry an Authorization header");

    // Token present in the database
    let resp = server
        .get("/auth/status")
        .add_header(header::AUTHORIZATION, &auth_value)
        .await;
    resp.assert_status_ok();
    assert_eq!(resp.json::<serde_json::Value>(), json!(true));

    // After logout the token is revoked
    server.post("/auth/logout").await.assert_status_ok();
    let resp = server
        .get("/auth/status")
        .add_header(header::AUTHORIZATION, &auth_value)
        .await;
    resp.assert_status_ok();
    assert_eq!(resp.json::<serde_json::Value>(), json!(false));

    Ok(())
}

#[tokio::test]
async fn status_missing_or_malformed_authorization() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    let (_oidc, issuer) = start_mock_oidc().await;
    let state = test_app_state(&issuer).await;
    let server = test_server_with(
        state,
        "http://graph.invalid".to_string(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    // TODO: these test asserts current misleading behaviour of auth_core
    // TODO: modify auth_core to return 401 Unauthorized

    // No Authorization header
    server
        .get("/auth/status")
        .await
        .assert_status(StatusCode::INTERNAL_SERVER_ERROR);

    // Authorization present but not the Bearer scheme
    server
        .get("/auth/status")
        .add_header(header::AUTHORIZATION, "Basic abc")
        .await
        .assert_status(StatusCode::INTERNAL_SERVER_ERROR);

    // Authorization present but not a well-formed JWT
    server
        .get("/auth/status")
        .add_header(header::AUTHORIZATION, "Bearer not-a-jwt")
        .await
        .assert_status(StatusCode::INTERNAL_SERVER_ERROR);

    Ok(())
}

#[tokio::test]
async fn status_returns_false_for_expired_token() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    const TOKEN_EXPIRY_SECS: u64 = 2;

    let (_oidc, issuer) = start_mock_oidc_with_expiry(TOKEN_EXPIRY_SECS).await;
    let mut graph = Server::new_async().await;
    let captured = mock_graph_capturing_bearer(&mut graph);
    let state = test_app_state(&issuer).await;
    let mut server = test_server_with(
        state,
        graph.url(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    authenticate(&mut server).await;

    server.get("/api/health").await.assert_status_ok();
    let auth_value = captured
        .lock()
        .unwrap()
        .clone()
        .expect("proxied request should carry an Authorization header");

    sleep(Duration::from_secs(TOKEN_EXPIRY_SECS + 2)).await;

    let resp = server
        .get("/auth/status")
        .add_header(header::AUTHORIZATION, &auth_value)
        .await;
    resp.assert_status_ok();
    assert_eq!(resp.json::<serde_json::Value>(), json!(false));

    Ok(())
}

/// A `cors_allow` allow-list that only permits localhost origins, used to test
/// `returnTo` open-redirect protection.
fn localhost_cors_allow() -> Option<Vec<Regex>> {
    Some(vec![
        Regex::new(r"^https?://localhost(:\d+)?/?").expect("valid regex"),
    ])
}

#[tokio::test]
async fn login_redirects_to_allowed_return_to() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    let (_oidc, issuer) = start_mock_oidc().await;
    let state = test_app_state_with(&issuer, localhost_cors_allow()).await;
    let mut server = test_server_with(
        state,
        "http://graph.invalid".to_string(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    let location = authenticate_with_return_to(&mut server, "http://localhost:5173/").await;

    assert_eq!(
        location, "http://localhost:5173/",
        "an allow-listed returnTo should be honoured after login"
    );

    Ok(())
}

#[tokio::test]
async fn login_falls_back_to_default_for_disallowed_return_to() -> anyhow::Result<()> {
    if skip_in_dev_container() {
        return Ok(());
    }
    init_test();

    let (_oidc, issuer) = start_mock_oidc().await;
    let state = test_app_state_with(&issuer, localhost_cors_allow()).await;
    let mut server = test_server_with(
        state,
        "http://graph.invalid".to_string(),
        MemoryStore::default(),
        inactivity_expiry(600),
    );

    let location = authenticate_with_return_to(&mut server, "https://evil.com/phish").await;

    assert_eq!(
        location, "http://localhost/dashboard",
        "a disallowed returnTo should fall back to the default URL to prevent open redirects"
    );

    Ok(())
}
