use openidconnect::{CsrfToken, PkceCodeVerifier};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthSessionData {
    pub csrf_token: CsrfToken,
    pub pcke_verifier: PkceCodeVerifier,
}

impl Clone for AuthSessionData {
    fn clone(&self) -> Self {
        Self {
            csrf_token: self.csrf_token.clone(),
            pcke_verifier: PkceCodeVerifier::new(self.pcke_verifier.secret().clone()),
        }
    }
}

impl AuthSessionData {

    pub const SESSION_KEY: &str = "auth_session_data";

    pub fn new(csrf_token: CsrfToken, pcke_verifier: PkceCodeVerifier) -> Self {
        Self {
            csrf_token: csrf_token,
            pcke_verifier: pcke_verifier,
        }
    }
    pub fn id(&self) -> &str {
        self.csrf_token.secret().as_str()
    }
}
