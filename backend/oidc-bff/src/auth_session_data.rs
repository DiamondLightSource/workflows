use std::time::Duration;

use crate::Result;
use anyhow::anyhow;
use chrono::{DateTime, Utc};
use openidconnect::{AccessToken, CsrfToken, Nonce, PkceCodeVerifier, RefreshToken};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginSessionData {
    pub csrf_token: CsrfToken,
    pub pcke_verifier: PkceCodeVerifier,
    pub nonce: Nonce,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TokenSessionData {
    pub access_token: AccessToken,
    pub access_token_expires_at: DateTime<Utc>,
    pub refresh_token: RefreshToken,
}

impl TokenSessionData {
    pub const SESSION_KEY: &str = "token_session_data";

    pub fn new(
        access_token: AccessToken,
        access_token_expires_at: DateTime<Utc>,
        refresh_token: RefreshToken,
    ) -> Self {
        Self {
            access_token,
            access_token_expires_at,
            refresh_token,
        }
    }

    pub fn from_token_response<T: oauth2::TokenResponse>(token_response: &T) -> Result<Self> {
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
            access_token,
            access_token_expires_at,
            refresh_token,
        ))
    }

    pub fn access_token_is_expired(&self) -> bool {
        self.access_token_expires_at <= Utc::now()
    }
}

impl Clone for LoginSessionData {
    fn clone(&self) -> Self {
        Self {
            csrf_token: self.csrf_token.clone(),
            pcke_verifier: PkceCodeVerifier::new(self.pcke_verifier.secret().clone()),
            nonce: self.nonce.clone(),
        }
    }
}

impl LoginSessionData {
    pub const SESSION_KEY: &str = "auth_session_data";

    pub fn new(csrf_token: CsrfToken, pcke_verifier: PkceCodeVerifier, nonce: Nonce) -> Self {
        Self {
            csrf_token,
            pcke_verifier,
            nonce,
        }
    }
}
