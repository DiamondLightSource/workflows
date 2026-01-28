//! Token data structures shared between services.

use std::time::Duration;

use anyhow::anyhow;
use chrono::{DateTime, Utc};
use openidconnect::{AccessToken, IssuerUrl, RefreshToken, SubjectIdentifier};
use serde::{Deserialize, Serialize};

use crate::Result;

/// Token data that can be stored in sessions or loaded from database.
/// 
/// This structure is used by both `oidc-bff` (with required access_token for sessions)
/// and `auth-daemon` (with optional access_token when loaded from database).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TokenData {
    pub issuer: IssuerUrl,
    pub subject: SubjectIdentifier,
    /// Access token - may be None if only refresh token is available (daemon startup)
    pub access_token: Option<AccessToken>,
    pub access_token_expires_at: DateTime<Utc>,
    pub refresh_token: RefreshToken,
}

impl TokenData {
    /// Session key for storing token data
    pub const SESSION_KEY: &'static str = "token_session_data";

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

    /// Create TokenData from an OAuth2 token response.
    /// Requires the access token to be present.
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

    /// Update tokens in place from a token response
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

    /// Create a new TokenData with updated tokens from a response
    pub fn update_tokens<T: oauth2::TokenResponse>(&self, token_response: &T) -> Self {
        let mut clone = self.clone();
        clone.update_tokens_mut(token_response);
        clone
    }

    /// Check if the access token is expired or missing
    pub fn access_token_is_expired(&self) -> bool {
        self.access_token_expires_at <= Utc::now() || self.access_token.is_none()
    }

    /// Get the access token secret string, if available
    pub fn access_token_secret(&self) -> Option<&str> {
        self.access_token.as_ref().map(|t| t.secret().as_str())
    }
}
