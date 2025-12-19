
use chrono::{DateTime, Utc};
use openidconnect::core::{CoreClient, CoreProviderMetadata};
use sodiumoxide::crypto::box_::{PublicKey, SecretKey};
use std::time::Duration;
use openidconnect::{AccessToken, IssuerUrl, RefreshToken, SubjectIdentifier};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use oauth2::{ClientId, ClientSecret, EndpointMaybeSet, EndpointNotSet, EndpointSet, reqwest};
use sea_orm::{Database, DatabaseConnection};

use crate::config::Config;
use crate::Result;
use crate::database::read_token_from_database;
use anyhow::anyhow;

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

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TokenData {
    pub issuer: IssuerUrl,
    pub subject: SubjectIdentifier,
    pub access_token: Option<AccessToken>,
    pub access_token_expires_at: DateTime<Utc>,
    pub refresh_token: RefreshToken,
}

impl TokenData {

    pub fn new(
        issuer: IssuerUrl,
        subject: SubjectIdentifier,
        access_token: Option<AccessToken>,
        access_token_expires_at: DateTime<Utc>,
        refresh_token: RefreshToken,
    ) -> Self {
        Self {
            issuer,
            subject,
            access_token,
            access_token_expires_at,
            refresh_token,
        }
    }

    pub fn from_token_response<T: oauth2::TokenResponse>(
        token_response: &T,
        issuer: IssuerUrl,
        subject: SubjectIdentifier,
    ) -> Result<Self> {
        let access_token = token_response.access_token().clone();
        let refresh_token = token_response
            .refresh_token()
            .ok_or_else(|| anyhow!("Token Response did not return a refresh token"))?
            .clone();
        let access_token_expires_at = Utc::now()
            + token_response
                .expires_in()
                .unwrap_or_else(|| Duration::from_secs(60));
        Ok(Self::new(
            issuer,
            subject,
            Some(access_token),
            access_token_expires_at,
            refresh_token,
        ))
    }

    pub fn update_tokens_mut<T: oauth2::TokenResponse>(&mut self, token_response: &T) {
        let access_token = token_response.access_token().clone();
        let refresh_token = token_response.refresh_token();
        let access_token_expires_at = Utc::now()
            + token_response
                .expires_in()
                .unwrap_or_else(|| Duration::from_secs(60));
        if let Some(refresh_token) = refresh_token {
            self.refresh_token = refresh_token.clone();
        }
        self.access_token = Some(access_token);
        self.access_token_expires_at = access_token_expires_at;
    }

    pub fn update_tokens<T: oauth2::TokenResponse>(&self, token_response: &T) -> Self {
        let mut clone = self.clone();
        clone.update_tokens_mut(token_response);
        clone
    }

    pub fn access_token_is_expired(&self) -> bool {
        self.access_token_expires_at <= Utc::now() || self.access_token.is_none()
    }
}


