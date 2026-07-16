use auth_core::config::CommonConfig;
use serde::{Deserialize, Serialize};
use std::path::Path;

const DEFAULT_TOKEN_REVIEW_AUDIENCE: &str = "workflows-auth-broker";

fn default_token_review_audience() -> String {
    DEFAULT_TOKEN_REVIEW_AUDIENCE.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthBrokerConfig {
    #[serde(flatten)]
    pub common: CommonConfig,
    pub encryption_private_key: String,
    #[serde(default = "default_token_review_audience")]
    pub token_review_audience: String,
}

impl AuthBrokerConfig {
    pub fn from_file<P: AsRef<Path>>(path: P) -> auth_core::Result<Self> {
        auth_core::config::load_config_from_file(path)
    }
}
