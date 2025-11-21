use openidconnect::{
    ClientId, ClientSecret, IssuerUrl,
    core::{CoreClient, CoreProviderMetadata},
    reqwest,
};
use crate::state::AppState;
use std::{
    sync::Arc,
};
use tower_sessions::{Session};

use axum::{
    body::Body,
    extract::{Request, State},
    http::{self, HeaderValue, StatusCode},
    middleware,
};

use crate::Result;

use crate::auth_session_data::{TokenSessionData};

pub async fn inject_token_from_session(
    State(state): State<Arc<AppState>>,
    session: Session,
    req: Request,
    next: middleware::Next,
) -> Result<impl axum::response::IntoResponse> {
    // Read token from session
    let token: Option<TokenSessionData> = session.get(TokenSessionData::SESSION_KEY).await?;
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

            let token_response = client
                .exchange_refresh_token(&token.refresh_token)?
                .request_async(&http_client)
                .await?;

            let token_data = TokenSessionData::from_token_response(&token_response)?;
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
