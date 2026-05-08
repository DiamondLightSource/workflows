use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::sync::RwLock;

use auth_core::async_trait::async_trait;
use auth_core::database::RefreshTokenInfo;
use auth_core::middleware::traits::{RetryPolicy, TokenInspector, TokenStore};
use auth_core::oidc::{
    DbConnection, HttpClient, OidcClient, SodiumPublicKey, create_db_connection,
    create_oidc_client, decode_public_key, decode_secret_key, exchange_refresh_token,
};

use auth_core::oauth2::{self, AccessToken, RefreshToken};
use auth_core::openidconnect::{IssuerUrl, SubjectIdentifier};
use axum::http::StatusCode;

use crate::config::DaemonConfig;

type Result<T> = auth_core::Result<T>;

pub struct RouterState {
    pub config: DaemonConfig,
    pub token: RwLock<Option<TokenData>>,
    pub http_client: HttpClient,
    pub oidc_client: OidcClient,
    pub database_connection: DbConnection,
    pub public_key: SodiumPublicKey,
}

impl RouterState {
    pub async fn new(config: DaemonConfig, subject: &SubjectIdentifier) -> Result<Self> {
        let database_connection = create_db_connection(&config.common).await?;
        Self::with_database(config, subject, database_connection).await
    }

    pub async fn with_database(
        config: DaemonConfig,
        subject: &SubjectIdentifier,
        database_connection: impl Into<DbConnection>,
    ) -> Result<Self> {
        let (oidc_client, http_client) = create_oidc_client(&config.common).await?;
        let public_key = decode_public_key(&config.common.encryption_public_key)?;
        let private_key = decode_secret_key(&config.encryption_private_key)?;
        let database_connection = database_connection.into();
        let stored = auth_core::database::read_token_from_database(
            &database_connection,
            subject,
            None,
            &public_key,
            &private_key,
        )
        .await?;
        let token = TokenData::new(
            IssuerUrl::new(stored.issuer)?,
            SubjectIdentifier::new(stored.subject),
            None,
            Utc::now(), // expired — will be refreshed on first request
            RefreshToken::new(stored.refresh_token_secret),
        );
        Ok(Self {
            config,
            token: RwLock::new(Some(token)),
            http_client,
            oidc_client,
            database_connection,
            public_key,
        })
    }
}

#[async_trait]
impl TokenStore for RouterState {
    type Token = TokenData;

    async fn load_token(&self) -> Option<Self::Token> {
        self.token.read().await.clone()
    }

    async fn save_token(&self, token: &Self::Token) -> auth_core::Result<()> {
        let mut guard = self.token.write().await;
        *guard = Some(token.clone());
        Ok(())
    }

    async fn refresh_and_persist(&self, token: &Self::Token) -> auth_core::Result<Self::Token> {
        let token_response =
            exchange_refresh_token(&self.oidc_client, &self.http_client, &token.refresh_token)
                .await?;
        let new_token = token.update_tokens(&token_response);
        auth_core::database::write_token_to_database(
            &self.database_connection,
            &new_token,
            &self.public_key,
        )
        .await?;
        self.save_token(&new_token).await?;
        Ok(new_token)
    }
}

impl RetryPolicy for RouterState {
    fn should_retry(&self, status: StatusCode, body: &[u8]) -> bool {
        if !status.is_success() {
            return true;
        }
        // Check for GraphQL errors in the response body
        if let Ok(json) = serde_json::from_slice::<serde_json::Value>(body)
            && let Some(errors) = json.get("errors").and_then(|e| e.as_array())
        {
            return !errors.is_empty();
        }
        false
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

impl TokenInspector for TokenData {
    fn is_expired(&self) -> bool {
        self.access_token_is_expired()
    }
    fn bearer_value(&self) -> Option<String> {
        self.access_token.as_ref().map(|t| t.secret().to_string())
    }
}

impl RefreshTokenInfo for TokenData {
    fn refresh_token_secret(&self) -> &str {
        self.refresh_token.secret()
    }
    fn issuer(&self) -> &str {
        self.issuer.as_str()
    }
    fn subject(&self) -> &str {
        self.subject.as_str()
    }
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
