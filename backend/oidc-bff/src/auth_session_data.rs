use openidconnect::{
    CsrfToken, Nonce, PkceCodeVerifier,
};
use serde::{Deserialize, Serialize};

// Re-export TokenData from auth-common for use as session data
// Note: In BFF context, access_token should always be Some() after successful authentication
pub use auth_common::TokenData as TokenSessionData;

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginSessionData {
    pub csrf_token: CsrfToken,
    pub pcke_verifier: PkceCodeVerifier,
    pub nonce: Nonce,
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
