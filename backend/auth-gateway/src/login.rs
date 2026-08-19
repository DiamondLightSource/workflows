use std::sync::Arc;

use auth_core::openidconnect::core::CoreAuthenticationFlow;
use auth_core::openidconnect::{CsrfToken, Nonce, PkceCodeChallenge, RedirectUrl, Scope};
use axum::extract::{Query, State};
use axum::response::Redirect;
use regex::Regex;
use serde::Deserialize;
use tower_sessions::Session;
use tracing::{info, instrument};

use crate::Result;
use crate::auth_session_data::LoginSessionData;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct LoginQueryParameters {
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
}

#[axum::debug_handler]
#[instrument(skip(state, session, query_parameters), fields(session_id = tracing::field::Empty), err(Debug))]
pub async fn login(
    State(state): State<Arc<AppState>>,
    session: Session,
    Query(query_parameters): Query<LoginQueryParameters>,
) -> Result<Redirect> {
    tracing::Span::current().record("session_id", tracing::field::debug(session.id()));
    info!(
        return_to_provided = query_parameters.return_to.is_some(),
        "initiating OIDC authorization flow"
    );
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

    // Store data in the users session.
    let auth_session_data = LoginSessionData::new(
        csrf_token,
        pkce_verifier,
        nonce,
        validate_return_to(&state.cors_allow, query_parameters.return_to),
    );
    session
        .insert(LoginSessionData::SESSION_KEY, auth_session_data)
        .await?;
    Ok(Redirect::temporary(auth_url.as_str()))
}

/// Only allow `return_to` URLs that match the configured allowed origins
/// (`cors_allow`); anything else becomes `None` so the callback falls back to
/// the default return URL. This prevents an attacker-supplied `returnTo`
/// parameter from redirecting a user to an arbitrary site after login.
fn validate_return_to(
    cors_allow: &Option<Vec<Regex>>,
    return_to: Option<String>,
) -> Option<String> {
    let return_to = return_to?;
    let Some(cors_allow) = cors_allow else {
        return None;
    };
    cors_allow
        .iter()
        .any(|re| re.is_match(&return_to))
        .then_some(return_to)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cors_allow() -> Option<Vec<Regex>> {
        Some(vec![
            Regex::new(r"^https:\/\/([a-zA-Z0-9\-]+\.)*diamond\.ac\.uk\/?").expect("valid regex"),
            Regex::new(r"^https?:\/\/localhost(:\d+)?\/?").expect("valid regex"),
        ])
    }

    #[test]
    fn allows_localhost_return_to() {
        let allow = cors_allow();
        assert_eq!(
            validate_return_to(&allow, Some("http://localhost:5173/".to_string())),
            Some("http://localhost:5173/".to_string())
        );
    }

    #[test]
    fn allows_diamond_return_to_with_path() {
        let allow = cors_allow();
        assert_eq!(
            validate_return_to(
                &allow,
                Some("https://staging.workflows.diamond.ac.uk/dashboard".to_string()),
            ),
            Some("https://staging.workflows.diamond.ac.uk/dashboard".to_string())
        );
    }

    #[test]
    fn rejects_external_url() {
        let allow = cors_allow();
        assert_eq!(
            validate_return_to(&allow, Some("https://evil.com/phish".to_string())),
            None
        );
    }

    #[test]
    fn rejects_return_to_when_no_allowlist_configured() {
        assert_eq!(
            validate_return_to(&None, Some("http://localhost:5173/".to_string())),
            None
        );
    }

    #[test]
    fn handles_missing_return_to() {
        let allow = cors_allow();
        assert_eq!(validate_return_to(&allow, None), None);
    }
}
