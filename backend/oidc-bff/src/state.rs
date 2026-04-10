use async_trait::async_trait;
use axum::http::StatusCode;
use std::sync::Arc;
use tower_sessions::Session;

use crate::Result;
use crate::auth_session_data::TokenSessionData;
use crate::config::GatewayConfig;
use auth_core::database::{self, RefreshTokenInfo};
use auth_core::middleware::traits::{RetryPolicy, TokenInspector, TokenStore};
use auth_core::oidc::{
    DbConnection, HttpClient, OidcClient, SodiumPublicKey, create_db_connection,
    create_oidc_client, decode_public_key, exchange_refresh_token,
};

#[derive(Debug, Clone)]
pub struct AppState {
    pub http_client: HttpClient,
    pub oidc_client: OidcClient,
    pub database_connection: DbConnection,
    pub public_key: SodiumPublicKey,
}

impl AppState {
    pub async fn new(config: GatewayConfig) -> Result<Self> {
        let (oidc_client, http_client) = create_oidc_client(&config.common).await?;
        let database_connection = create_db_connection(&config.common).await?;
        let public_key = decode_public_key(&config.common.encryption_public_key)?;
        Ok(AppState {
            http_client,
            oidc_client,
            database_connection,
            public_key,
        })
    }
}

impl TokenInspector for TokenSessionData {
    fn is_expired(&self) -> bool {
        self.access_token_is_expired()
    }
    fn bearer_value(&self) -> Option<String> {
        Some(self.access_token.secret().to_string())
    }
}

impl RefreshTokenInfo for TokenSessionData {
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

pub struct GatewayTokenContext {
    pub state: Arc<AppState>,
    pub session: Session,
}

#[async_trait]
impl TokenStore for GatewayTokenContext {
    type Token = TokenSessionData;

    async fn load_token(&self) -> Option<Self::Token> {
        self.session
            .get(TokenSessionData::SESSION_KEY)
            .await
            .ok()
            .flatten()
    }

    async fn save_token(&self, token: &Self::Token) -> auth_core::Result<()> {
        self.session
            .insert(TokenSessionData::SESSION_KEY, token.clone())
            .await
            .map_err(|e| anyhow::anyhow!("session insert error: {e}"))?;
        Ok(())
    }

    async fn refresh_and_persist(&self, token: &Self::Token) -> auth_core::Result<Self::Token> {
        let token_response = exchange_refresh_token(
            &self.state.oidc_client,
            &self.state.http_client,
            &token.refresh_token,
        )
        .await?;
        let new_token = token.update_tokens(&token_response);
        database::write_token_to_database(
            &self.state.database_connection,
            &new_token,
            &self.state.public_key,
        )
        .await?;
        self.save_token(&new_token).await?;
        Ok(new_token)
    }
}

impl RetryPolicy for GatewayTokenContext {
    fn should_retry(&self, status: StatusCode, _body: &[u8]) -> bool {
        status == StatusCode::UNAUTHORIZED
    }
}
