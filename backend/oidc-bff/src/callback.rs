use axum::debug_handler;
use axum::extract::{Query, State};
use openidconnect::core::{CoreClient, CoreProviderMetadata, CoreUserInfoClaims};
use openidconnect::{
    AccessTokenHash, AuthorizationCode, ClientId, ClientSecret, IssuerUrl, OAuth2TokenResponse,
    TokenResponse, reqwest,
};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use crate::Result;
use crate::auth_session_data::AuthSessionData;
use crate::state::AppState;

#[derive(Serialize, Deserialize)]
pub struct CallbackQuery {
    pub code: String,
    pub state: String,
}
use anyhow::anyhow;

#[debug_handler]
pub async fn callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackQuery>,
    session: Session,
) -> Result<String> {
    // Retrieve data from the users session
    let auth_session_data: AuthSessionData = session
        .get(AuthSessionData::SESSION_KEY)
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
        Some(ClientSecret::new(state.config.client_secret.to_string())),
    );

    // Once the user has been redirected to the redirect URL, you'll have access to the
    // authorization code. For security reasons, your code should verify that the `state`
    // parameter returned by the server matches `csrf_state`.

    if auth_session_data.csrf_token.secret() != &params.state {
        return Err(anyhow!("invalid state").into());
    }

    // Now you can exchange it for an access token and ID token.
    let token_response = client
        .exchange_code(AuthorizationCode::new(params.code.to_string()))?
        // Set the PKCE code verifier.
        .set_pkce_verifier(auth_session_data.pcke_verifier)
        .request_async(&http_client)
        .await?;

    // Extract the ID token claims after verifying its authenticity and nonce.
    let id_token = token_response
        .id_token()
        .ok_or_else(|| anyhow!("Server did not return an ID token"))?;
    let id_token_verifier = client.id_token_verifier();
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

    // The authenticated user's identity is now available. See the IdTokenClaims struct for a
    // complete listing of the available claims.
    let response = format!(
        "User {} with e-mail address {} has authenticated successfully",
        claims.subject().as_str(),
        claims
            .email()
            .map(|email| email.as_str())
            .unwrap_or("<not provided>"),
    );

    // If available, we can use the user info endpoint to request additional information.

    // // The user_info request uses the AccessToken returned in the token response. To parse custom
    // // claims, use UserInfoClaims directly (with the desired type parameters) rather than using the
    // // CoreUserInfoClaims type alias.
    // let userinfo: CoreUserInfoClaims = client
    //     .user_info(token_response.access_token().to_owned(), None)?
    //     .request_async(&http_client)
    //     .await
    //     .map_err(|err| anyhow!("Failed requesting user info: {}", err))?;

    // See the OAuth2TokenResponse trait for a listing of other available fields such as
    // access_token() and refresh_token().
    Ok(response)
}
