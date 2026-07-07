use std::borrow::Cow;
use std::sync::Arc;

use auth_core::openidconnect::{
    AccessTokenHash, AuthorizationCode, CsrfToken, OAuth2TokenResponse, RedirectUrl, TokenResponse,
};
use axum::debug_handler;
use axum::extract::{Query, State};
use axum::response::Redirect;
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use crate::Result;
use crate::auth_session_data::{LoginSessionData, TokenSessionData};
use crate::state::AppState;
use auth_core::database::write_token_to_database;

#[derive(Serialize, Deserialize)]
pub struct CallbackQuery {
    pub code: String,
    pub state: String,
}
use anyhow::anyhow;

#[debug_handler]
pub async fn callback(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CallbackQuery>,
    session: Session,
) -> Result<Redirect> {
    // Retrieve data from the users session
    let auth_session_data: LoginSessionData = session
        .remove(LoginSessionData::SESSION_KEY)
        .await?
        .ok_or(anyhow!("session expired"))?;

    // Once the user has been redirected to the redirect URL, you'll have access to the
    // authorization code. For security reasons, your code should verify that the `state`
    // parameter returned by the server matches `csrf_state`.

    if auth_session_data.csrf_token != CsrfToken::new(params.state) {
        return Err(anyhow!("invalid state").into());
    }
    let redirect_url = Cow::Owned(RedirectUrl::new(state.callback_url.to_string())?);
    // Now you can exchange it for an access token and ID token.
    let token_response = state
        .oidc_client
        .exchange_code(AuthorizationCode::new(params.code.to_string()))?
        // Set the PKCE code verifier.
        .set_pkce_verifier(auth_session_data.pcke_verifier)
        .set_redirect_uri(redirect_url)
        .request_async(&state.http_client)
        .await?;

    // Extract the ID token claims after verifying its authenticity and nonce.
    let id_token = token_response
        .id_token()
        .ok_or_else(|| anyhow!("Server did not return an ID token"))?;
    let id_token_verifier = state.oidc_client.id_token_verifier();
    let claims = id_token.claims(&id_token_verifier, &auth_session_data.nonce)?;

    // Verify the access token hash to ensure that the access token hasn't been substituted for
    // another user's.
    if let Some(expected_access_token_hash) = claims.access_token_hash() {
        let actual_access_token_hash = AccessTokenHash::from_token(
            token_response.access_token(),
            id_token.signing_alg()?,
            id_token.signing_key(&id_token_verifier)?,
        )?;
        if actual_access_token_hash != *expected_access_token_hash {
            return Err(anyhow!("Invalid access token").into());
        }
    }

    let token_data = TokenSessionData::from_token_response(
        &token_response,
        claims.issuer().clone(),
        claims.subject().clone(),
    )?;
    write_token_to_database(&state.database_connection, &token_data, &state.public_key).await?;
    session
        .insert(TokenSessionData::SESSION_KEY, token_data)
        .await?;

    session.save().await?;
    let redirect_url = if let Some(return_to_url) = auth_session_data.return_to_url {
        return_to_url.clone()
    } else {
        state.callback_default_return_to_url.clone()
    };
    Ok(Redirect::temporary(redirect_url.as_str()))
}
