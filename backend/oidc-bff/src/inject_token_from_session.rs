use crate::{database::write_token_to_database, state::AppState};
use auth_common::http_utils::{clone_request, prepare_headers};
use std::sync::Arc;
use tower_sessions::Session;

use axum::{
    extract::{Request, State},
    http::StatusCode,
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
    let token: Option<TokenSessionData> = session.get(TokenSessionData::SESSION_KEY).await
        .map_err(|e| anyhow::anyhow!("Failed to read session: {}", e))?;
    if let Some(mut token) = token {
        if token.access_token_is_expired() {
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

// clone_request and prepare_headers are now provided by auth_common::http_utils

async fn refresh_token_and_update_session(
    state: &AppState,
    token: &TokenSessionData,
    session: &Session,
) -> Result<TokenSessionData> {
    let token = refresh_token(state, token).await?;
    write_token_to_database(&state.database_connection, &token, &state.public_key).await?;
    session
        .insert(TokenSessionData::SESSION_KEY, token.clone())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to update session: {}", e))?;
    Ok(token)
}

async fn refresh_token(state: &AppState, token: &TokenSessionData) -> Result<TokenSessionData> {
    let token_response = state
        .oidc_client
        .exchange_refresh_token(&token.refresh_token)
        .map_err(|e| anyhow::anyhow!("Failed to build refresh token request: {}", e))?
        .request_async(&state.http_client)
        .await
        .map_err(|e| anyhow::anyhow!("Token refresh request failed: {}", e))?;
    let token = token.update_tokens(&token_response);
    Ok(token)
}
