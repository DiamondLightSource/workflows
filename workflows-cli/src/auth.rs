#![cfg_attr(test, allow(unused))]
use auth_core::oauth2::{AccessToken, RefreshToken, TokenResponse};
use auth_core::{
    config::CommonConfig,
    oidc::{create_oidc_client, exchange_refresh_token},
};
use jsonwebtoken::dangerous::insecure_decode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs::{self, DirEntry, File},
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

/// An error relating to authentication
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Unable to locate home directory. Is $HOME set?")]
    UnknownHomeDir,
    #[error(
        "Failed to access cluster authorization. Try running `kubectl get pods` to prompt a login"
    )]
    FailedCacheAccess(#[from] std::io::Error),
    #[error("No cached tokens found")]
    NoCachedTokens,
    #[error("Could not deserialize cached token file: {0}")]
    InvalidCache(#[from] serde_json::Error),
    #[error("Token decode failed: {0}")]
    JwtDecode(String),
    #[error("Access token does not contain a valid expiry")]
    MissingExpiry,
    #[error("Token refresh failed: {0}")]
    RefreshFailed(String),
    #[error("Could not find a cached refresh token")]
    NoRefreshToken,
    #[error("Failed to store refresh response")]
    FailedCacheSerialize,
}

#[derive(Serialize, Deserialize)]
struct CachedTokens {
    id_token: AccessToken,
    refresh_token: Option<RefreshToken>,
}

/// Use the refresh token to acquire a new access token
async fn use_refresh_token(
    refresh_token: &RefreshToken,
    path: &Path,
) -> Result<AccessToken, AuthError> {
    let config = CommonConfig {
        client_id: "workflows-cli".to_string(),
        client_secret: "".to_string(),
        oidc_provider_url: "https://identity.diamond.ac.uk/realms/dls".to_string(),
        port: 8000,
        postgres_user: "".to_string(),
        postgres_password: "".to_string(),
        postgres_database: "".to_string(),
        postgres_hostname: "".to_string(),
        postgres_port: 0,
        encryption_public_key: "".to_string(),
        cors_allow: None,
    };
    let (oidc_client, http_client) = create_oidc_client(&config)
        .await
        .expect("Failed to set up OIDC client");
    let refreshed_tokens = exchange_refresh_token(&oidc_client, &http_client, refresh_token)
        .await
        .map_err(|e| AuthError::RefreshFailed(format!("{e:?}")))?;

    let new_cached_tokens = CachedTokens {
        id_token: refreshed_tokens.access_token().to_owned(),
        refresh_token: refreshed_tokens.refresh_token().map(|t| t.to_owned()),
    };
    let cache_string = serde_json::to_string_pretty(&new_cached_tokens)
        .map_err(|_| AuthError::FailedCacheSerialize)?;
    fs::write(path, cache_string).map_err(AuthError::FailedCacheAccess)?;
    Ok(new_cached_tokens.id_token)
}

/// Reads the authentication token from the cluster cache and if expired, refreshes.
#[cfg(not(test))]
pub async fn get_auth_token() -> Result<AccessToken, AuthError> {
    let mut path = std::env::home_dir().ok_or(AuthError::UnknownHomeDir)?;
    path.push(".kube");
    path.push("cache");
    path.push("workflows");
    path.push("oidc-login");
    let dir_contents = fs::read_dir(path).map_err(AuthError::FailedCacheAccess)?;
    let mut newest_file: Option<DirEntry> = None;
    let mut timestamp: SystemTime = UNIX_EPOCH;
    for file in dir_contents.flatten() {
        let file_timestamp = file.metadata()?.modified()?;

        if file_timestamp > timestamp {
            newest_file = Some(file);
            timestamp = file_timestamp;
        }
    }
    let file_path = newest_file.ok_or(AuthError::NoCachedTokens)?.path();

    let file = fs::File::open(&file_path).map_err(AuthError::FailedCacheAccess)?;

    let tokens =
        serde_json::from_reader::<File, CachedTokens>(file).map_err(AuthError::InvalidCache)?;

    let expiry = insecure_decode::<Value>(tokens.id_token.secret())
        .map_err(|e| AuthError::JwtDecode(e.to_string()))?
        .claims["exp"]
        .as_u64()
        .ok_or(AuthError::MissingExpiry)?;

    if expiry
        >= SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Cannot read system time")
            .as_secs()
    {
        return Ok(tokens.id_token);
    };

    let refresh_token = tokens
        .refresh_token
        .as_ref()
        .ok_or(AuthError::NoRefreshToken)?;

    use_refresh_token(refresh_token, &file_path).await
}

/// Mocked out version of get_auth_token for unit tests
#[cfg(test)]
pub async fn get_auth_token() -> Result<AccessToken, AuthError> {
    Ok(AccessToken::new("valid".to_string()))
}
