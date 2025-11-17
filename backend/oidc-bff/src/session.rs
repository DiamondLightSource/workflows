use std::{sync::Arc, time::Duration};

use moka::future::Cache;
use openidconnect::{CsrfToken, PkceCodeVerifier};

pub type SessionStore = Arc<Cache<String, Session>>;

#[derive(Debug)]
pub struct Session {
    pub csrf_token: CsrfToken,
    pub pcke_verifier: PkceCodeVerifier,
}

impl Clone for Session {
    fn clone(&self) -> Self {
        Self {
            csrf_token: self.csrf_token.clone(),
            pcke_verifier: PkceCodeVerifier::new(self.pcke_verifier.secret().clone()),
        }
    }
}

impl Session {
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

pub fn create_session_store() -> SessionStore {
    let cache = Cache::builder()
        .max_capacity(10000)
        .time_to_live(Duration::from_secs(600))
        .build();
    return Arc::new(cache);
}
