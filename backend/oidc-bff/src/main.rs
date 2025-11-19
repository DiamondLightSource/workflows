mod config;
use clap::Parser;
use config::Config;
use openidconnect::{AccessToken, ClientId, ClientSecret, IssuerUrl, RefreshToken, core::{CoreClient, CoreProviderMetadata}, reqwest};
use tower_sessions::{Expiry, MemoryStore, Session, SessionManagerLayer, cookie::time::Duration};
mod login;
use std::net::{Ipv4Addr, SocketAddr};
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
    Router,
    body::Body,
    debug_handler,
    extract::Request,
    http::{self, HeaderValue, StatusCode},
    middleware,
    routing::{get, post},
};
use axum_reverse_proxy::ReverseProxy;

use crate::auth_session_data::{LoginSessionData, TokenSessionData};

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let config: Config = Config::parse();
    let port = config.port;
    let appstate = AppState::new(config);

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rust TLS cryptography");

    let router = create_router(appstate);
    serve(router, port).await
}

fn create_router(state: AppState) -> Router {
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
        .route_layer(middleware::from_fn(inject_token_from_session))
        .route("/auth/login", get(login::login))
        .route("/read", get(counter::counter_read))
        .route("/write", get(counter::counter_write))
        .route("/auth/callback", get(callback::callback))
        .route("/auth/logout", post(logout))
        .layer(session_layer);
    let router: Router = router.with_state(state);
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

async fn inject_token_from_session (
    mut req: Request,
    next: middleware::Next,
) -> Result<impl axum::response::IntoResponse> {
    // Extract the session from request extensions
    let session = req
        .extensions()
        .get::<Session>()
        .expect("Session extension missing");

    let state = req
        .extensions()
        .get::<AppState>()
        .expect("AppState extension missing");

    // Read token from session
    let token: Option<TokenSessionData> = session
        .get(TokenSessionData::SESSION_KEY)
        .await
        .ok()
        .flatten();

    if let Some(token) = token {

        // token = refresh_token(token);

        let value = format!("Bearer {}", token.access_token.secret());
        let req = req.clone();
        req.headers_mut().insert(
            http::header::AUTHORIZATION,
            HeaderValue::from_str(&value).unwrap(),
        );
        let response = next.run(req).await;

        if response.status() == StatusCode::UNAUTHORIZED {
            // Attempt the refresh
            // Retrieve data from the users session
            let auth_session_data: LoginSessionData = session
                .remove(LoginSessionData::SESSION_KEY)
                .await?
                .ok_or(anyhow!("session expired"))?;

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


            req.headers_mut().insert(
                http::header::AUTHORIZATION,
                HeaderValue::from_str(&value).unwrap(),
            );
            Ok(next.run(req).await)
        } else {
            Ok(response)
        }
    } else {
        Ok(next.run(req).await)
    }

    
}
