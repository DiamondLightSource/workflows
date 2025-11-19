use openidconnect::{CsrfToken, Nonce, PkceCodeVerifier};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthSessionData {
    pub csrf_token: CsrfToken,
    pub pcke_verifier: PkceCodeVerifier,
    pub nonce: Nonce,
}

impl Clone for AuthSessionData {
    fn clone(&self) -> Self {
        Self {
            csrf_token: self.csrf_token.clone(),
            pcke_verifier: PkceCodeVerifier::new(self.pcke_verifier.secret().clone()),
            nonce: self.nonce.clone(),
        }
    }
}

impl AuthSessionData {
    pub const SESSION_KEY: &str = "auth_session_data";
    pub const ACCESS_TOKEN_KEY: &str = "access_token";

    pub fn new(csrf_token: CsrfToken, pcke_verifier: PkceCodeVerifier, nonce: Nonce) -> Self {
        Self {
            csrf_token: csrf_token,
            pcke_verifier: pcke_verifier,
            nonce: nonce,
        }
    }
}
