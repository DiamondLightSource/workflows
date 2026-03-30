use crate::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;

// Create the config for auth-package
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommonConfig {
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
}

/// Generic config loader - works for any struct that immplements Deserialize
pub fn load_config_from_file<T: serde::de::DeserializeOwned, P: AsRef<Path>>(path: P) -> Result<T> {
    let content = std::fs::read_to_string(&path)?;
    match path.as_ref().extension().and_then(|e| e.to_str()) {
        Some("json") => Ok(serde_json::from_str(&content)?),
        _ => Ok(serde_yaml::from_str(&content)?),
    }
}
