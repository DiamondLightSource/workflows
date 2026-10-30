use crate::auth_session_data::TokenSessionData;
use crate::state::AppState;

use auth_core::database::write_token_to_database;
use auth_core::oauth2::{ClientId, ClientSecret, Scope};
use auth_core::oidc::OidcClient;
use auth_core::openidconnect::core::CoreProviderMetadata;
use auth_core::openidconnect::{IssuerUrl, SubjectIdentifier, TokenResponse};
use auth_core::validate_token::{ValidatedAuthToken, ValidationMethod};
use axum_extra::TypedHeader;
use axum_extra::headers::Authorization;
use axum_extra::headers::authorization::Bearer;
use jsonwebtoken::dangerous::insecure_decode;

use axum::response::{IntoResponse, Response};
use axum::{Json, extract::State};

use hyper::StatusCode;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Deserialize, Serialize)]
pub struct IdTokenClaims {
    iss: String,
    preferred_username: String,
    sub: String,
    name: Option<String>,
    fedid: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ClientCredentials {
    pub client_id: String,
    pub client_secret: String,
}

pub struct AppError {
    status: StatusCode,
    message: String,
}
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (self.status, self.message).into_response()
    }
}

impl AppError {
    fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }

    fn new_500(message: impl Into<String>) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, message)
    }
}

pub async fn client_credential_login(
    State(state): State<Arc<AppState>>,
    TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>,
    Json(client_creds): Json<ClientCredentials>,
) -> Result<StatusCode, AppError> {
    let http_client = reqwest::ClientBuilder::new()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| {
            AppError::new(
                e.status().unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
                e.to_string(),
            )
        })?;

    let provider_metadata =
        CoreProviderMetadata::discover_async(state.oidc_provider_url.clone(), &http_client)
            .await
            .map_err(|e| AppError {
                status: StatusCode::SERVICE_UNAVAILABLE,
                message: format!("OIDC discovery failed: {e}"),
            })?;

    let auth_token = state
        .token_validator
        .validate_token(Some(auth_header), ValidationMethod::Jwt)
        .await;

    match auth_token {
        ValidatedAuthToken::Valid(_) => {}
        ValidatedAuthToken::Invalid => {
            return Err(AppError::new(
                StatusCode::UNAUTHORIZED,
                "Invalid token".to_string(),
            ));
        }
        ValidatedAuthToken::Missing => {
            return Err(AppError::new(
                StatusCode::UNAUTHORIZED,
                "Missing auth token".to_string(),
            ));
        }
        ValidatedAuthToken::Failed(e) => {
            return Err(AppError::new_500(e));
        }
    };

    let client = OidcClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(client_creds.client_id),
        Some(ClientSecret::new(client_creds.client_secret)),
    );
    let token_response = match client
        .exchange_client_credentials()
        .unwrap_or(Err(AppError::new_500(
            "Client credentials flow not supported",
        ))?)
        .add_scope(Scope::new("offline_access".to_string()))
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("fedid".to_string()))
        .request_async(&http_client)
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            tracing::warn!("Client credential exchange failed: {e}");
            return Err(AppError::new(
                StatusCode::UNAUTHORIZED,
                "Invalid client credentials",
            ));
        }
    };

    let id_token = token_response.id_token().ok_or(AppError::new(
        StatusCode::BAD_GATEWAY,
        "No ID token was obtained for these client credentials".to_string(),
    ))?;

    let claims: IdTokenClaims = insecure_decode::<IdTokenClaims>(&id_token.to_string())
        .map_err(|_| AppError::new_500("Unexpected ID token format".to_string()))?
        .claims;

    let token_data = TokenSessionData::from_token_response(
        &token_response,
        IssuerUrl::new(claims.iss)
            .map_err(|_| AppError::new_500("Could not convert iss claim to URL".to_string()))?,
        SubjectIdentifier::new(claims.sub),
        claims.name,
        Some(claims.preferred_username),
        claims.fedid,
    )
    .map_err(|_| AppError::new_500("Failed to construct token session data"))?;

    write_token_to_database(&state.database_connection, &token_data, &state.public_key)
        .await
        .map_err(|e| {
            tracing::error!("Database write failed: {:?}", e);
            AppError::new_500("Failed to write token to database")
        })?;

    Ok(StatusCode::OK)
}
