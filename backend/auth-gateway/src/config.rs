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
}

impl GatewayConfig {
    /// Load config from JSON or YAML file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        config::load_config_from_file(path)
    }
}
