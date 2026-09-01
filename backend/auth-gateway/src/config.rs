use crate::Result;
use auth_core::config::{self, CommonConfig};
use serde::Deserialize;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayConfig {
    #[serde(flatten)]
    pub common: CommonConfig,
    pub callback_url: String,
    pub callback_default_return_to_url: String,
    pub cors_allow: Option<Vec<String>>,
    /// Whether to set the `Secure` attribute on the session cookie.
    ///
    /// Defaults to `true` (safe for production, where TLS is terminated at the
    /// ingress). Set to `false` only for plain-HTTP local development, where
    /// browsers and curl would otherwise reject a `Secure` cookie.
    pub session_secure: Option<bool>,
    /// Set Cookie SameSite
    ///
    /// Defaults to Strict. Can be set to Lax for localhost development.
    pub cookie_same_site: Option<String>,
}

impl GatewayConfig {
    /// Load config from JSON or YAML file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        config::load_config_from_file(path)
    }
}
