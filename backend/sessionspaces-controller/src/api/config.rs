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
        Self::new(
            required_env("DATABASE_URL")?,
            env::var("DATABASE_PASSWORD").ok(),
            required_env("LDAP_URL")?,
            env::var("SESSIONSPACES_API_BIND").unwrap_or_else(|_| "0.0.0.0:8081".into()),
        )
    }

    fn new(
        database_url: String,
        password: Option<String>,
        ldap_url: String,
        bind: String,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let mut database = MySqlConnectOptions::from_str(&database_url).map_err(|_| {
            std::io::Error::new(std::io::ErrorKind::InvalidInput, "Invalid DATABASE_URL")
        })?;
        if let Some(password) = password {
            database = database.password(password.trim());
        }

        Ok(Self {
            database,
            ldap_url,
            bind,
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

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::ConnectOptions;

    fn values(password: Option<&str>) -> Config {
        Config::new(
            "mysql://ispyb_ro@ispybdbproxy.diamond.ac.uk:4306/ispyb".to_string(),
            password.map(str::to_string),
            "ldap://ldapmaster.diamond.ac.uk".to_string(),
            "0.0.0.0:8081".to_string(),
        )
        .unwrap()
    }

    #[test]
    fn trims_surrounding_whitespace_from_database_password() {
        for password in ["secret\n", "  secret  ", "\tsecret\r\n"] {
            let url = values(Some(password)).database.to_url_lossy();
            assert_eq!(url.password(), Some("secret"), "{password:?}");
        }
    }

    #[test]
    fn leaves_url_password_and_defaults_intact() {
        let config = values(None);
        let url = config.database.to_url_lossy();
        assert_eq!(url.username(), "ispyb_ro");
        assert_eq!(url.password(), None);
        assert_eq!(config.bind, "0.0.0.0:8081");
    }
}
