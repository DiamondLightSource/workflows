use openidconnect::core::{CoreClient, CoreProviderMetadata};
use sodiumoxide::crypto::box_::{PublicKey, SecretKey};
use openidconnect::{IssuerUrl, SubjectIdentifier};
use tokio::sync::RwLock;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use oauth2::{ClientId, ClientSecret, EndpointMaybeSet, EndpointNotSet, EndpointSet, reqwest};
use sea_orm::{Database, DatabaseConnection};

use crate::config::Config;
use crate::Result;
use crate::database::read_token_from_database;
use anyhow::anyhow;

// Re-export TokenData from auth-common
pub use auth_common::TokenData;

pub struct RouterState {
    pub config: Config,
    pub token: RwLock<Option<TokenData>>,
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

impl RouterState {

    pub async fn new(config: Config, subject: impl Into<&SubjectIdentifier>) -> Result<Self> {
        let database_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            config.postgres_user,
            config.postgres_password,
            config.postgres_hostname,
            config.postgres_port,
            config.postgres_database
        );
        let database_connection = Database::connect(&database_url).await?;
        Self::with_database(config, subject, database_connection).await
    }

    pub async fn with_database(config: Config, subject: impl Into<&SubjectIdentifier>, database_connection: impl Into<DatabaseConnection>) -> Result<Self> {
    
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

        let public_key = PublicKey::from_slice(&BASE64.decode(&config.encryption_public_key)?)
            .ok_or(anyhow!("Invalid public key"))?;

        let private_key = SecretKey::from_slice(&BASE64.decode(&config.encryption_private_key)?)
            .ok_or(anyhow!("Invalid public key"))?;

        let subject = subject.into();
        let database_connection = database_connection.into();
        let token = read_token_from_database(&database_connection, subject, None, &public_key, &private_key).await?;

        Ok(Self {config, token: RwLock::new(Some(token)),
            http_client,
            oidc_client,
            database_connection,
            public_key,
        })
    }
}

// TokenData is now provided by auth_common - see `pub use auth_common::TokenData;` above


