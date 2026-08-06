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

#[derive(Serialize, Deserialize)]
struct CachedTokens {
    id_token: AccessToken,
    refresh_token: RefreshToken,
}

async fn refresh_using_auth_core(refresh_token: &RefreshToken, path: &Path) -> AccessToken {
    let config = CommonConfig {
        client_id: "workflows-cli".to_string(),
        client_secret: "".to_string(),
        oidc_provider_url: "https://identity-test.diamond.ac.uk/realms/dls".to_string(),
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
        .expect("Client setup failed");
    let refreshed_tokens = exchange_refresh_token(&oidc_client, &http_client, refresh_token)
        .await
        .expect("Failed to refresh tokens");

    let new_cached_tokens = CachedTokens {
        id_token: refreshed_tokens.access_token().to_owned(),
        refresh_token: refreshed_tokens
            .refresh_token()
            .expect("No refresh token")
            .to_owned(),
    };
    fs::write(
        path,
        serde_json::to_string_pretty(&new_cached_tokens)
            .expect("Unable to create new token object"),
    )
    .expect("Couldn't write to file");
    new_cached_tokens.id_token
}

pub async fn get_auth_token() -> AccessToken {
    let cache_path = Path::new("/root/.kube/cache/workflows/oidc-login"); // CHANGE TO /home/user
    let dir_contents = fs::read_dir(cache_path).expect("Unable to access cached tokens directory");
    let mut newest_file: Option<DirEntry> = None;
    let mut timestamp: SystemTime = UNIX_EPOCH;
    for file in dir_contents.flatten() {
        let file_metadata = file.metadata().unwrap();

        let file_timestamp = file_metadata.modified().unwrap();

        if file_timestamp > timestamp {
            newest_file = Some(file);
            timestamp = file_timestamp;
        }
    }
    let file_path = newest_file.expect("No cached token files found").path();

    let file = fs::File::open(&file_path).expect(r#"
        Authentication error. Please run 'kubectl get workflows -n {}' to prompt a login and try again.
    "#);

    let tokens = serde_json::from_reader::<File, CachedTokens>(file)
        .expect("Error: cached tokens are formatted incorrectly");

    let expiry = insecure_decode::<Value>(&tokens.id_token.secret().to_string())
        .expect("Unable to decode access token")
        .claims["exp"]
        .as_u64()
        .expect("expiry is not an int");

    if expiry
        >= SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Cannot read system time")
            .as_secs()
    {
        return tokens.id_token;
    };

    refresh_using_auth_core(&tokens.refresh_token, &file_path).await
}
