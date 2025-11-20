mod config;
use bytes::BytesMut;
use clap::Parser;
use config::Config;
use openidconnect::{
    AccessToken, ClientId, ClientSecret, IssuerUrl, OAuth2TokenResponse, RefreshToken, RefreshTokenRequest, core::{CoreClient, CoreProviderMetadata}, reqwest
};
use tower_sessions::{Expiry, MemoryStore, Session, SessionManagerLayer, cookie::time::Duration};
mod login;
use std::{
    net::{Ipv4Addr, SocketAddr},
    sync::{Arc, Mutex},
};
mod auth_session_data;
mod state;
use state::AppState;
mod api;
mod callback;
mod counter;
mod error;
use anyhow::anyhow;

type Result<T> = std::result::Result<T, error::Error>;

use axum::{
    Json, Router, body::Body, debug_handler, extract::{Request, State}, http::{self, HeaderValue, StatusCode}, middleware, response::IntoResponse, routing::{get, post}
};
use axum_reverse_proxy::ReverseProxy;

use crate::auth_session_data::{LoginSessionData, TokenSessionData};

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let config: Config = Config::parse();
    let port = config.port;
    let appstate = Arc::new(AppState::new(config));

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rust TLS cryptography");

    let router = create_router(appstate);
    serve(router, port).await
}

fn create_router(state: Arc<AppState>) -> Router {
    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        // .with_expiry(Expiry::OnInactivity(Duration::seconds(600)))
        ;

    let proxy: Router<()> =
        ReverseProxy::new("/", "https://workflows.diamond.ac.uk/graphql").into();
    let proxy = proxy;
    let router = Router::new()
        .nest_service("/api", proxy)
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            inject_token_from_session,
        ))
        .route("/auth/login", get(login::login))
        .route("/read", get(counter::counter_read))
        .route("/write", get(counter::counter_write))
        .route("/auth/callback", get(callback::callback))
        .route("/auth/logout", post(logout))
        .route("/debug", get(debug))
        .layer(session_layer)
        .with_state(state);
    return router;
}

async fn serve(router: Router, port: u16) -> Result<()> {
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port)).await?;
    let service = router.into_make_service();
    axum::serve(listener, service).await?;
    Ok(())
}

async fn logout() {}

async fn inject_token_from_session(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: middleware::Next,
) -> Result<impl axum::response::IntoResponse> {
    // Extract the session from request extensions
    let session = req
        .extensions()
        .get::<Session>()
        .expect("Session extension missing")
        .clone();

    // Read token from session
    let token: Option<TokenSessionData> = session
        .get(TokenSessionData::SESSION_KEY)
        .await
        .ok()
        .flatten();

    if let Some(token) = token {

        let value = format!("Bearer {}", token.access_token.secret());
        let mut req = clone_request(req).await?;
        req.0.headers_mut().insert(
            http::header::AUTHORIZATION,
            HeaderValue::from_str(&value).unwrap(),
        );
        req.0.headers_mut().remove(http::header::COOKIE);
        let response = next.clone().run(req.0).await;

        if response.status() == StatusCode::UNAUTHORIZED {
            // Attempt the refresh
            let http_client = reqwest::ClientBuilder::new()
                // Following redirects opens the client up to SSRF vulnerabilities.
                .redirect(reqwest::redirect::Policy::none())
                .build()?;

            // Use OpenID Connect Discovery to fetch the provider metadata.
            let provider_metadata = CoreProviderMetadata::discover_async(
                IssuerUrl::new(state.config.oidc_provider_url.to_string())?,
                &http_client,
            )
            .await?;

            let client = CoreClient::from_provider_metadata(
                provider_metadata,
                ClientId::new(state.config.client_id.to_string()),
                if state.config.client_secret.is_empty() {
                    None
                } else {
                    Some(ClientSecret::new(state.config.client_secret.to_string()))
                },
            );

            let token_response = client.exchange_refresh_token(&token.refresh_token)?.request_async(&http_client).await?;

            let access_token = token_response.access_token();
            let refresh_token = token_response
                .refresh_token()
                .ok_or_else(|| anyhow!("Server did not return a refresh token"))?;
            let token_data = TokenSessionData::new(access_token.clone(), refresh_token.clone());
            session
                .insert(TokenSessionData::SESSION_KEY, token_data)
                .await?;

            req.1.headers_mut().insert(
                http::header::AUTHORIZATION,
                HeaderValue::from_str(&value).unwrap(),
            );
            req.1.headers_mut().remove(http::header::COOKIE);
            Ok(next.run(req.1).await)
        } else {
            Ok(response)
        }
    } else {
        Ok(next.run(req).await)
    }
}

async fn clone_request(req: Request<Body>) -> Result<(Request<Body>, Request<Body>)> {
    // TODO: an inefficient method of cloning a request, improve this
    let (parts, body) = req.into_parts();
    let bytes = http_body_util::BodyExt::collect(body).await?.to_bytes();
    let req1 = Request::from_parts(parts.clone(), Body::from(bytes.clone()));
    let req2 = Request::from_parts(parts, Body::from(bytes));
    Ok((req1, req2))
}

async fn debug(State(state): State<Arc<AppState>>, session: Session) -> Result<impl IntoResponse> {
    let auth_session_data: Option<LoginSessionData> = session
                .get(LoginSessionData::SESSION_KEY)
                .await?;

    let token_session_data: Option<TokenSessionData> = session
                .get(TokenSessionData::SESSION_KEY)
                .await?;

    Ok(Json((state, auth_session_data, token_session_data)))
}