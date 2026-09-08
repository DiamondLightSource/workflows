//! Environment-based database, LDAP and HTTP listener configuration.

use sqlx::mysql::MySqlConnectOptions;
use std::{env, str::FromStr};
/// Connection settings and bind address for the private API.
pub(super) struct Config {
    pub database: MySqlConnectOptions,
    pub ldap_url: String,
    pub bind: String,
}
impl Config {
    /// Reads the required `DATABASE_URL` and LDAP URL, plus optional overrides.
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let database =
            MySqlConnectOptions::from_str(&required_env("DATABASE_URL")?).map_err(|_| {
                std::io::Error::new(std::io::ErrorKind::InvalidInput, "Invalid DATABASE_URL")
            })?;
        let database = match env::var("DATABASE_PASSWORD") {
            Ok(password) => database.password(&password),
            Err(_) => database,
        };

        Ok(Self {
            database,
            ldap_url: required_env("LDAP_URL")?,
            bind: env::var("SESSIONSPACES_API_BIND").unwrap_or_else(|_| "0.0.0.0:8081".into()),
        })
    }
}
/// Rejects missing, non-Unicode or whitespace-only environment values.
fn required_env(name: &str) -> Result<String, std::io::Error> {
    env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("{name} must be set"),
            )
        })
}
