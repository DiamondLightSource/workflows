use crate::config::CommonConfig;
use anyhow::anyhow;
use base64::{
    Engine,
    engine::general_purpose::{STANDARD as BASE64, URL_SAFE_NO_PAD},
};
use chrono::{DateTime, Utc};
use oauth2::{ClientId, ClientSecret, reqwest};
use openidconnect::core::CoreProviderMetadata;
use openidconnect::{IssuerUrl, RefreshToken, SubjectIdentifier};
use sea_orm::{Database, DatabaseConnection};
use sodiumoxide::crypto::box_::{PublicKey, SecretKey};

use crate::Result;

// Re-export types needed by downstream crates (auth-gateway, auth-broker)
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

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct DiamondAdditionalClaims {
    pub fedid: Option<String>,
}

impl openidconnect::AdditionalClaims for DiamondAdditionalClaims {}

pub type DiamondIdTokenFields = openidconnect::IdTokenFields<
    DiamondAdditionalClaims,
    openidconnect::EmptyExtraTokenFields,
    openidconnect::core::CoreGenderClaim,
    openidconnect::core::CoreJweContentEncryptionAlgorithm,
    openidconnect::core::CoreJwsSigningAlgorithm,
>;

pub type DiamondTokenResponse =
    openidconnect::StandardTokenResponse<DiamondIdTokenFields, openidconnect::core::CoreTokenType>;

pub type OidcClient = openidconnect::Client<
    DiamondAdditionalClaims,
    openidconnect::core::CoreAuthDisplay,
    openidconnect::core::CoreGenderClaim,
    openidconnect::core::CoreJweContentEncryptionAlgorithm,
    openidconnect::core::CoreJsonWebKey,
    openidconnect::core::CoreAuthPrompt,
    openidconnect::StandardErrorResponse<openidconnect::core::CoreErrorResponseType>,
    DiamondTokenResponse,
    openidconnect::core::CoreTokenIntrospectionResponse,
    openidconnect::core::CoreRevocableToken,
    openidconnect::core::CoreRevocationErrorResponse,
    openidconnect::EndpointSet,
    openidconnect::EndpointNotSet,
    openidconnect::EndpointNotSet,
    openidconnect::EndpointNotSet,
    openidconnect::EndpointMaybeSet,
    openidconnect::EndpointMaybeSet,
>;

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

    let oidc_client = OidcClient::from_provider_metadata(
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

/// The subset of access-token claims the gateway's `/auth/status` endpoint needs.
pub struct AccessTokenClaims {
    pub subject: SubjectIdentifier,
    pub expires_at: Option<DateTime<Utc>>,
}

pub fn claims_from_access_token(access_token: &str) -> Result<AccessTokenClaims> {
    let payload = access_token
        .split('.')
        .nth(1)
        .ok_or_else(|| anyhow!("access token is not a well-formed JWT"))?;
    let decoded = URL_SAFE_NO_PAD.decode(payload)?;

    #[derive(serde::Deserialize)]
    struct RawClaims {
        sub: String,
        exp: Option<i64>,
    }
    let raw: RawClaims = serde_json::from_slice(&decoded)?;
    let expires_at = raw.exp.and_then(|exp| DateTime::from_timestamp(exp, 0));
    Ok(AccessTokenClaims {
        subject: SubjectIdentifier::new(raw.sub),
        expires_at,
    })
}

pub async fn exchange_refresh_token(
    oidc_client: &OidcClient,
    http_client: &reqwest::Client,
    refresh_token: &RefreshToken,
) -> Result<DiamondTokenResponse> {
    let token_response = oidc_client
        .exchange_refresh_token(refresh_token)?
        .request_async(http_client)
        .await?;
    Ok(token_response)
}
