use std::sync::Arc;

use anyhow::anyhow;
use auth_core::database::write_token_to_database;
use auth_core::oauth2::StandardDeviceAuthorizationResponse;
use auth_core::oidc::{DevicePollOutcome, poll_device_access_token};
use auth_core::openidconnect::{Nonce, Scope, TokenResponse};
use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::Result;
use crate::auth_session_data::TokenSessionData;
use crate::state::AppState;

#[derive(Serialize)]
pub struct DeviceStartResponse {
    /// Code the operator types at `verification_uri`.
    pub user_code: String,
    /// URL the operator opens in a browser.
    pub verification_uri: String,
    /// URL pre-filled with the user code, if the provider supplied one.
    pub verification_uri_complete: Option<String>,
    /// Opaque code the caller passes back to [`device_poll`].
    pub device_code: String,
    /// Seconds until `device_code`/`user_code` expire.
    pub expires_in: u64,
    /// Minimum seconds the caller should wait between polls.
    pub interval: u64,
}

/// `POST /auth/device/start` — request a device + user code from Keycloak.
pub async fn device_start(State(state): State<Arc<AppState>>) -> Result<Json<DeviceStartResponse>> {
    let response: StandardDeviceAuthorizationResponse = state
        .device_oidc_client
        .exchange_device_code()
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("offline_access".to_string()))
        .request_async(&state.http_client)
        .await?;

    Ok(Json(DeviceStartResponse {
        user_code: response.user_code().secret().clone(),
        verification_uri: response.verification_uri().as_str().to_string(),
        verification_uri_complete: response
            .verification_uri_complete()
            .map(|uri| uri.secret().clone()),
        device_code: response.device_code().secret().clone(),
        expires_in: response.expires_in().as_secs(),
        interval: response.interval().as_secs(),
    }))
}

#[derive(Deserialize)]
pub struct DevicePollRequest {
    pub device_code: String,
}

/// `POST /auth/device/poll` - check status of operator approval
/// 202 - not yet approved; 200 - approved; 400 - device code expired / request denied
pub async fn device_poll(
    State(state): State<Arc<AppState>>,
    Json(request): Json<DevicePollRequest>,
) -> Result<Response> {
    let token_url = state
        .device_oidc_client
        .token_uri()
        .ok_or_else(|| anyhow!("token endpoint missing from OIDC discovery document"))?
        .as_str()
        .to_string();

    let outcome = match poll_device_access_token(
        &token_url,
        &state.machine_client_id,
        &state.machine_client_secret,
        &request.device_code,
        &state.http_client,
    )
    .await
    {
        Ok(outcome) => outcome,
        Err(error) => {
            return Ok((
                StatusCode::BAD_REQUEST,
                Json(json!({ "status": "error", "error": format!("{error:?}") })),
            )
                .into_response());
        }
    };

    let token_response = match outcome {
        DevicePollOutcome::Pending => {
            return Ok((StatusCode::ACCEPTED, Json(json!({ "status": "pending" }))).into_response());
        }
        DevicePollOutcome::Complete(token_response) => token_response,
    };

    // Verify the ID token and pull the machine's subject from it.
    let id_token = token_response
        .id_token()
        .ok_or_else(|| anyhow!("token response did not include an ID token"))?;
    let verifier = state.oidc_client.id_token_verifier();
    let claims = id_token.claims(&verifier, |_: Option<&Nonce>| Ok::<(), String>(()))?;
    let subject = claims.subject().clone();
    let issuer = claims.issuer().clone();

    // Persist the offline refresh token
    let token_data =
        TokenSessionData::from_token_response(token_response.as_ref(), issuer, subject.clone())?;
    write_token_to_database(&state.database_connection, &token_data, &state.public_key).await?;

    Ok((
        StatusCode::OK,
        Json(json!({ "status": "complete", "subject": subject.as_str() })),
    )
        .into_response())
}
