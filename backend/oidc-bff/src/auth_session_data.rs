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
    pub refresh_token: RefreshToken,
}

impl TokenSessionData {
    pub const SESSION_KEY: &str = "token_session_data";

    pub fn new(access_token: AccessToken, refresh_token: RefreshToken) -> Self {
        Self {
            access_token: access_token,
            refresh_token: refresh_token,
        }
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
            csrf_token: csrf_token,
            pcke_verifier: pcke_verifier,
            nonce: nonce,
        }
    }
}
