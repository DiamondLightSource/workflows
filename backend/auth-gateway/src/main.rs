mod auth_session_data;
mod callback;
mod config;
mod login;
mod state;

use auth_core::middleware::inject_token::inject_token_with;
use clap::Parser;
use config::GatewayConfig;
use state::{AppState, GatewayTokenContext};
use std::{
    net::{Ipv4Addr, SocketAddr},
    process,
    sync::Arc,
};
use tower_sessions::{Expiry, MemoryStore, Session, SessionManagerLayer, cookie::time::Duration};

type Result<T> = std::result::Result<T, auth_core::error::Error>;

use axum::{
    Json, Router,
    extract::{Request, State},
    http::HeaderMap,
    middleware,
    response::IntoResponse,
    routing::{get, post},
};
use axum_reverse_proxy::ReverseProxy;
use tokio::signal::unix::{Signal, SignalKind, signal};

use crate::auth_session_data::TokenSessionData;

use reqwest::Method;
use tower_http::cors::{AllowOrigin, CorsLayer};

#[derive(Parser, Debug)]
#[command(author, version, about)]
struct Args {
    /// Path to config file (JSON or YAML)
    //TODO: Change this from env variable to hardcoded
    #[arg(
        short,
        long,
        env = "WORKFLOWS_AUTH_GATEWAY_CONFIG",
        default_value = "config.yaml"
    )]
    config: String,
    #[arg(env = "GRAPH_URL")]
    graph_url: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let args: Args = Args::try_parse()?;
    let graph_url = args.graph_url;
    let config = GatewayConfig::from_file(args.config)?;
    let port = config.common.port;
    let appstate = Arc::new(AppState::new(config).await?);
    auth_core::database::migrate_database(&appstate.database_connection).await?;

    auth_core::rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .expect("Failed to install rust TLS cryptography");

    let router = create_router(appstate, graph_url);
    serve(router, port).await
}

fn create_router(state: Arc<AppState>, graph_url: String) -> Router {
    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_expiry(Expiry::OnInactivity(Duration::seconds(600)));

    let proxy: Router<()> = ReverseProxy::new("/api", &graph_url).into();
    let proxy = proxy;

    let cors_origin = if let Some(cors_allow) = state.cors_allow.clone() {
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

    // `/auth/status` is authorized by a bearer token, not the session cookie, so
    // it needs no credentials — which lets it allow any origin (`*`) and be called
    // from any frontend without maintaining an origin allow-list.
    let status_cors = CorsLayer::new()
        .allow_origin(AllowOrigin::any())
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers([hyper::header::AUTHORIZATION, hyper::header::CONTENT_TYPE]);

    Router::new()
        .fallback_service(proxy)
        .layer(middleware::from_fn_with_state(
            state.clone(),
            gateway_inject_token,
        ))
        .route("/auth/login", get(login::login))
        .route("/auth/callback", get(callback::callback))
        .route("/auth/logout", post(logout))
        .route("/healthcheck", get(auth_core::healthcheck::healthcheck))
        .layer(session_layer)
        .layer(
            CorsLayer::new()
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
                .allow_headers([
                    hyper::header::ACCEPT,
                    hyper::header::CONTENT_TYPE,
                    hyper::header::AUTHORIZATION,
                ])
                .allow_origin(cors_origin)
                .allow_credentials(true),
        )
        // Registered *after* the credentialed CORS layer so it is not wrapped by
        // it — axum only applies a layer to routes added before it. This route
        // gets only its own permissive, credential-free `status_cors` instead.
        .route("/auth/status", get(status).layer(status_cors))
        .with_state(state)
}

async fn serve(router: Router, port: u16) -> Result<()> {
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port)).await?;
    let service = router.into_make_service();
    axum::serve(listener, service)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

/// Logout handler that:
/// 1. Retrieves the user's token from the session (to get subject ID)
/// 2. Deletes the token from the database (so workflows can't use it)
/// 3. Clears the session (so browser requests are no longer authenticated)
async fn logout(State(state): State<Arc<AppState>>, session: Session) -> Result<impl IntoResponse> {
    // Get the token data to find the subject for database deletion
    let token_session_data: Option<TokenSessionData> =
        session.get(TokenSessionData::SESSION_KEY).await?;

    // If we have token data, delete it from the database
    if let Some(token_data) = token_session_data {
        auth_core::database::delete_token_from_database(
            &state.database_connection,
            &token_data.subject,
        )
        .await?;
    }

    // Clear the entire session (removes both login and token data)
    session.flush().await?;

    Ok(axum::http::StatusCode::OK)
}

/// Status handler that returns the user's authentication status as a `bool`.
/// 1. Reads the bearer access token from the `Authorization` header.
/// 2. Decodes its `sub` and `exp` (unverified — see `claims_from_access_token`).
/// 3. Returns `false` if the token is already expired, otherwise whether a
///    non-expired token is stored in the database for that subject.
///
/// Response is marked cacheable to reduce load on databse
async fn status(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse> {
    let cache_headers = [
        (hyper::header::CACHE_CONTROL, "private, max-age=30"),
        (hyper::header::VARY, "Authorization"),
    ];

    let access_token = headers
        .get(hyper::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or_else(|| anyhow::anyhow!("missing or malformed Authorization header"))?;

    let claims = auth_core::oidc::claims_from_access_token(access_token)?;

    if let Some(expires_at) = claims.expires_at
        && expires_at <= chrono::Utc::now()
    {
        return Ok((cache_headers, Json(false)));
    }

    let is_authenticated =
        auth_core::database::token_exists_in_database(&state.database_connection, &claims.subject)
            .await?;

    Ok((cache_headers, Json(is_authenticated)))
}

async fn shutdown_signal() {
    let mut sigterm: Signal =
        signal(SignalKind::terminate()).expect("Failed to listen for SIGTERM");
    sigterm.recv().await;
    println!("Shutting Down");
    process::exit(0);
}

async fn gateway_inject_token(
    State(state): State<Arc<AppState>>,
    session: Session,
    req: Request,
    next: middleware::Next,
) -> Result<axum::response::Response> {
    let ctx = GatewayTokenContext { state, session };
    inject_token_with(&ctx, req, next).await
}
