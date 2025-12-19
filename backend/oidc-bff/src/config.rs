use std::path::Path;

use crate::Result;
use anyhow::anyhow;
use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub client_id: String,
    pub client_secret: String,
    pub oidc_provider_url: String,
    pub port: u16,
    pub postgres_user: String,
    pub postgres_password: String,
    pub postgres_database: String,
    pub postgres_hostname: String,
    pub postgres_port: u16,
    pub encryption_public_key: String,
    pub encryption_private_key: String,
}

impl Config {
    /// Load config from JSON or YAML file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = std::fs::read_to_string(&path)?;
        match path.as_ref().extension().and_then(|e| e.to_str()) {
            Some("json") => Ok(serde_json::from_str(&content)?),
            // otherwise assume yaml
            _ => Ok(serde_yaml::from_str(&content)?),
        }
    }
}
