//! Configuration loading helpers.

use std::path::Path;

use serde::de::DeserializeOwned;

use crate::Result;

/// Load configuration from a JSON or YAML file.
/// 
/// File type is determined by extension:
/// - `.json` → JSON
/// - anything else → YAML
pub fn load_config_from_file<T: DeserializeOwned, P: AsRef<Path>>(path: P) -> Result<T> {
    let content = std::fs::read_to_string(&path)?;
    match path.as_ref().extension().and_then(|e| e.to_str()) {
        Some("json") => Ok(serde_json::from_str(&content)?),
        // otherwise assume yaml
        _ => Ok(serde_yaml::from_str(&content)?),
    }
}

/// Trait for configuration types that can be loaded from files.
pub trait LoadableConfig: Sized + DeserializeOwned {
    /// Load configuration from a file path
    fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        load_config_from_file(path)
    }
}
