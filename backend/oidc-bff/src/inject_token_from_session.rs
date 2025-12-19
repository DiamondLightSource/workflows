use crate::{database::write_token_to_database, state::AppState};
use openidconnect::{
    ClientId, ClientSecret, IssuerUrl, TokenResponse,
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
    if let Some(mut token) = token {
        if (token.access_token_is_expired()) {
            token = refresh_token_and_update_session(&state, &token, &session).await?;
        }
        let mut req = clone_request(req).await?;
        prepare_headers(&mut req.0, &token);
        let response = next.clone().run(req.0).await;
        if response.status() == StatusCode::UNAUTHORIZED {
            token = refresh_token_and_update_session(&state, &token, &session).await?;
            prepare_headers(&mut req.1, &token);
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

async fn refresh_token_and_update_session(
    state: &AppState,
    token: &TokenSessionData,
    session: &Session,
) -> Result<TokenSessionData> {
    let token = refresh_token(state, token).await?;
    write_token_to_database(&state.database_connection, &token, &state.public_key).await?;
    session
        .insert(TokenSessionData::SESSION_KEY, token.clone())
        .await?;
    Ok(token)
}

async fn refresh_token(state: &AppState, token: &TokenSessionData) -> Result<TokenSessionData> {
    let token_response = state
        .oidc_client
        .exchange_refresh_token(&token.refresh_token)?
        .request_async(&state.http_client)
        .await?;
    let token = token.update_tokens(&token_response);
    Ok(token)
}
