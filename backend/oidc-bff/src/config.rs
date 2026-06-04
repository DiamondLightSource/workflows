use crate::Result;
use auth_core::config::{self, CommonConfig};
use serde::Deserialize;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayConfig {
    #[serde(flatten)]
    pub common: CommonConfig,
    // Can add extra fields in future if necessary
    pub machine_client_id: String,
    pub machine_client_secret: String,
}

impl GatewayConfig {
    /// Load config from JSON or YAML file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        config::load_config_from_file(path)
    }
}
