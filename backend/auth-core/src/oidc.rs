use crate::config::CommonConfig;
use anyhow::anyhow;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use oauth2::{ClientId, ClientSecret, EndpointMaybeSet, EndpointNotSet, EndpointSet, reqwest};
use openidconnect::core::{CoreClient, CoreProviderMetadata, CoreTokenResponse};
use openidconnect::{DeviceAuthorizationUrl, IssuerUrl, RefreshToken};
use sea_orm::{Database, DatabaseConnection};
use sodiumoxide::crypto::box_::{PublicKey, SecretKey};

use crate::Result;

// Re-export types needed by downstream crates (oidc-bff, auth-daemon)
pub use reqwest::Client as HttpClient;
pub use sea_orm::DatabaseConnection as DbConnection;
pub use sodiumoxide::crypto::box_::PublicKey as SodiumPublicKey;

pub async fn create_db_connection(config: &CommonConfig) -> Result<DatabaseConnection> {
    let database_url = format!(
        "postgres://{}:{}@{}:{}/{}",
        config.postgres_user,
        config.postgres_password,
        config.postgres_hostname,
        config.postgres_port,
        config.postgres_database
    );
    Database::connect(&database_url).await.map_err(Into::into)
}

pub type OidcClient = CoreClient<
    EndpointSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointMaybeSet,
    EndpointMaybeSet,
>;

pub type DeviceOidcClient = CoreClient<
    EndpointSet,
    EndpointSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointMaybeSet,
    EndpointMaybeSet,
>;

/// Outcome of a single device-authorization token poll.
pub enum DevicePollOutcome {
    /// The operator has not approved (or denied) the request yet — keep polling.
    Pending,
    /// The request was approved; carries the issued tokens (boxed as it is large).
    Complete(Box<CoreTokenResponse>),
}

pub async fn create_oidc_client(config: &CommonConfig) -> Result<(OidcClient, reqwest::Client)> {
    let http_client = reqwest::ClientBuilder::new()
        // Following redirects opens the client up to SSRF vulnerabilities.
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    // Use OpenID Connect Discovery to fetch the provider metadata.
    let provider_metadata = CoreProviderMetadata::discover_async(
        IssuerUrl::new(config.oidc_provider_url.to_string())?,
        &http_client,
    )
    .await?;

    let oidc_client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(config.client_id.to_string()),
        if config.client_secret.is_empty() {
            None
        } else {
            Some(ClientSecret::new(config.client_secret.to_string()))
        },
    );
    Ok((oidc_client, http_client))
}

pub fn decode_public_key(base64_key: &str) -> Result<PublicKey> {
    Ok(PublicKey::from_slice(&BASE64.decode(base64_key)?).ok_or(anyhow!("Invalid public key"))?)
}

pub fn decode_secret_key(base64_key: &str) -> Result<SecretKey> {
    Ok(SecretKey::from_slice(&BASE64.decode(base64_key)?).ok_or(anyhow!("Invalid secret key"))?)
}

pub async fn exchange_refresh_token(
    oidc_client: &OidcClient,
    http_client: &reqwest::Client,
    refresh_token: &RefreshToken,
) -> Result<CoreTokenResponse> {
    let token_response = oidc_client
        .exchange_refresh_token(refresh_token)?
        .request_async(http_client)
        .await?;
    Ok(token_response)
}

/// Builds a [`DeviceOidcClient`] for the shared machine-account client.
///
/// The provider's device-authorization endpoint is not surfaced by
/// [`CoreProviderMetadata`], so it is read directly from the realm's
/// `/.well-known/openid-configuration` discovery document.
pub async fn create_device_oidc_client(
    provider_url: &str,
    client_id: &str,
    client_secret: &str,
) -> Result<(DeviceOidcClient, reqwest::Client)> {
    let http_client = reqwest::ClientBuilder::new()
        // Following redirects opens the client up to SSRF vulnerabilities.
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    let provider_metadata = CoreProviderMetadata::discover_async(
        IssuerUrl::new(provider_url.to_string())?,
        &http_client,
    )
    .await?;

    let base_client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(client_id.to_string()),
        if client_secret.is_empty() {
            None
        } else {
            Some(ClientSecret::new(client_secret.to_string()))
        },
    );

    let discovery_body = http_client
        .get(format!(
            "{}/.well-known/openid-configuration",
            provider_url.trim_end_matches('/')
        ))
        .send()
        .await?
        .text()
        .await?;
    let discovery: serde_json::Value = serde_json::from_str(&discovery_body)?;
    let device_endpoint = discovery
        .get("device_authorization_endpoint")
        .and_then(|value| value.as_str())
        .ok_or_else(|| {
            anyhow!("device_authorization_endpoint missing from OIDC discovery document")
        })?;

    let client = base_client
        .set_device_authorization_url(DeviceAuthorizationUrl::new(device_endpoint.to_string())?);
    Ok((client, http_client))
}

/// Performs a single poll of the token endpoint for a pending device authorization.
///
/// Unlike oauth2's `exchange_device_access_token().request_async()`, which loops internally
/// until approval or expiry, this issues exactly one token request so callers can drive their
/// own poll loop (e.g. the stateless `/auth/device/poll` endpoint).
pub async fn poll_device_access_token(
    token_url: &str,
    client_id: &str,
    client_secret: &str,
    device_code: &str,
    http_client: &reqwest::Client,
) -> Result<DevicePollOutcome> {
    let mut params = vec![
        ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ("device_code", device_code),
        ("client_id", client_id),
    ];
    if !client_secret.is_empty() {
        params.push(("client_secret", client_secret));
    }

    let body_text = http_client
        .post(token_url)
        .form(&params)
        .send()
        .await?
        .text()
        .await?;
    let body: serde_json::Value = serde_json::from_str(&body_text)?;

    if let Some(error) = body.get("error").and_then(|value| value.as_str()) {
        return match error {
            "authorization_pending" | "slow_down" => Ok(DevicePollOutcome::Pending),
            other => Err(anyhow!("device token request failed: {other}").into()),
        };
    }

    let token_response: CoreTokenResponse = serde_json::from_value(body)?;
    Ok(DevicePollOutcome::Complete(Box::new(token_response)))
}
