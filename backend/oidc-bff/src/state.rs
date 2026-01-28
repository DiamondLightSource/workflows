use crate::Result;
use crate::config::Config;
use anyhow::anyhow;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use oauth2::{ClientId, ClientSecret, EndpointMaybeSet, EndpointNotSet, EndpointSet, reqwest};
use openidconnect::IssuerUrl;
use openidconnect::core::{CoreClient, CoreProviderMetadata};
use sea_orm::Database;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use sodiumoxide::crypto::box_::PublicKey;
#[derive(Debug, Clone)]
pub struct AppState {
    pub config: Config,
    pub http_client: reqwest::Client,
    pub oidc_client: openidconnect::core::CoreClient<
        EndpointSet,
        EndpointNotSet,
        EndpointNotSet,
        EndpointNotSet,
        EndpointMaybeSet,
        EndpointMaybeSet,
    >,
    pub database_connection: DatabaseConnection,
    pub public_key: PublicKey,
}

impl AppState {
    pub async fn new(config: Config) -> Result<Self> {
        let http_client = reqwest::ClientBuilder::new()
            // Following redirects opens the client up to SSRF vulnerabilities.
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| anyhow!("Failed to build HTTP client: {}", e))?;

        // Use OpenID Connect Discovery to fetch the provider metadata.
        let provider_metadata = CoreProviderMetadata::discover_async(
            IssuerUrl::new(config.oidc_provider_url.to_string())?,
            &http_client,
        )
        .await
        .map_err(|e| anyhow!("OIDC discovery failed: {}", e))?;

        let oidc_client = CoreClient::from_provider_metadata(
            provider_metadata,
            ClientId::new(config.client_id.to_string()),
            if config.client_secret.is_empty() {
                None
            } else {
                Some(ClientSecret::new(config.client_secret.to_string()))
            },
        );

        let database_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            config.postgres_user,
            config.postgres_password,
            config.postgres_hostname,
            config.postgres_port,
            config.postgres_database
        );
        let database_connection = Database::connect(&database_url).await?;

        let public_key = PublicKey::from_slice(&BASE64.decode(&config.encryption_public_key)?)
            .ok_or(anyhow!("Invalid public key"))?;

        Ok(AppState {
            config,
            http_client,
            oidc_client,
            database_connection,
            public_key,
        })
    }
}
