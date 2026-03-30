use crate::config::CommonConfig;
use anyhow::anyhow;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use oauth2::{ClientId, ClientSecret, EndpointMaybeSet, EndpointNotSet, EndpointSet, reqwest};
use openidconnect::core::{CoreClient, CoreProviderMetadata, CoreTokenResponse};
use openidconnect::{IssuerUrl, RefreshToken};
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
