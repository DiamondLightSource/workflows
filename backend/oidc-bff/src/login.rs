use std::sync::Arc;

use axum::extract::State;
use axum::response::Redirect;
use openidconnect::core::{CoreAuthenticationFlow, CoreClient, CoreProviderMetadata};
use openidconnect::reqwest;
use openidconnect::{
    ClientId, ClientSecret, CsrfToken, IssuerUrl, Nonce, PkceCodeChallenge, RedirectUrl, Scope,
};
use tower_sessions::Session;

use crate::Result;
use crate::auth_session_data::LoginSessionData;
use crate::state::AppState;

#[axum::debug_handler]
pub async fn login(State(state): State<Arc<AppState>>, session: Session) -> Result<Redirect> {
    // Set the URL the user will be redirected to after the authorization process.
    // .set_redirect_uri(RedirectUrl::new("https://localhost/callback".to_string())?);
    let oidc_client = state.oidc_client.clone().set_redirect_uri(RedirectUrl::new(
        // "http://localhost:5173/auth/callback".to_string(),
        "https://staging.workflows.diamond.ac.uk/auth/callback".to_string(),
    )?);
    // .set_redirect_uri(RedirectUrl::new("https://workflows.diamond.ac.uk".to_string())?)
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
        // Set the PKCE code challenge.
        .set_pkce_challenge(pkce_challenge)
        .url();

    // Store data in the users session
    let auth_session_data = LoginSessionData::new(csrf_token, pkce_verifier, nonce);
    session
        .insert(LoginSessionData::SESSION_KEY, auth_session_data)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to save session: {}", e))?;

    Ok(Redirect::temporary(auth_url.as_str()))
}
