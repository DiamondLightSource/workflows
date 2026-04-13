use crate::Result;
use auth_core::config::{self, CommonConfig};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonConfig {
    #[serde(flatten)]
    pub common: CommonConfig,
    pub graph_url: String,
    pub encryption_private_key: String,
}

impl DaemonConfig {
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        config::load_config_from_file(path)
    }
}
