use crate::state::AppState;
use openidconnect::{
    ClientId, ClientSecret, IssuerUrl,
    core::{CoreClient, CoreProviderMetadata},
    reqwest,
};
use std::sync::Arc;
use tower_sessions::Session;

use axum::{
    body::Body,
    extract::{Request, State},
    http::{self, HeaderValue, StatusCode},
    middleware,
};

use crate::Result;

use crate::auth_session_data::TokenSessionData;

pub async fn inject_token_from_session(
    State(state): State<Arc<AppState>>,
    session: Session,
    req: Request,
    next: middleware::Next,
) -> Result<impl axum::response::IntoResponse> {
    // Read token from session
    let token: Option<TokenSessionData> = session.get(TokenSessionData::SESSION_KEY).await?;
    if let Some(token) = token {
        let mut req = clone_request(req).await?;
        prepare_headers(&mut req.0, &token);
        let response = next.clone().run(req.0).await;
        if response.status() == StatusCode::UNAUTHORIZED {
            // Attempt the refresh
            let token_response = state
                .oidc_client
                .exchange_refresh_token(&token.refresh_token)?
                .request_async(&state.http_client)
                .await?;

            let token = TokenSessionData::from_token_response(&token_response)?;
            prepare_headers(&mut req.1, &token);
            session.insert(TokenSessionData::SESSION_KEY, token).await?;
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

fn prepare_headers(req: &mut Request, token: &TokenSessionData) {
    let value = format!("Bearer {}", token.access_token.secret());
    req.headers_mut().insert(
        http::header::AUTHORIZATION,
        HeaderValue::from_str(&value).unwrap(),
    );
    req.headers_mut().remove(http::header::COOKIE);
}
