use std::sync::Arc;

use auth_core::openidconnect::core::CoreAuthenticationFlow;
use auth_core::openidconnect::{CsrfToken, Nonce, PkceCodeChallenge, RedirectUrl, Scope};
use axum::extract::{Query, State};
use axum::response::Redirect;
use serde::Deserialize;
use tower_sessions::Session;

use crate::Result;
use crate::auth_session_data::LoginSessionData;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct LoginQueryParameters {
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
}

#[axum::debug_handler]
pub async fn login(
    State(state): State<Arc<AppState>>,
    session: Session,
    Query(query_parameters): Query<LoginQueryParameters>,
) -> Result<Redirect> {
    // Set the URL the user will be redirected to after the authorization process.
    let oidc_client = state
        .oidc_client
        .clone()
        .set_redirect_uri(RedirectUrl::new(state.callback_url.to_string())?);
    // Generate a PKCE challenge.
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    // Generate the full authorization URL.
    let (auth_url, csrf_token, nonce) = oidc_client
        .authorize_url(
            CoreAuthenticationFlow::AuthorizationCode,
            CsrfToken::new_random,
            Nonce::new_random,
        )
        // Set the desired scopes.
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("offline_access".to_string()))
        .add_scope(Scope::new("posix-uid".to_string()))
        .add_scope(Scope::new("fedid".to_string()))
        // Set the PKCE code challenge.
        .set_pkce_challenge(pkce_challenge)
        .url();

    // Store data in the users session
    let auth_session_data =
        LoginSessionData::new(csrf_token, pkce_verifier, nonce, query_parameters.return_to);
    session
        .insert(LoginSessionData::SESSION_KEY, auth_session_data)
        .await?;
    Ok(Redirect::temporary(auth_url.as_str()))
}
