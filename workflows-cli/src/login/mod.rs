use clap::Parser;
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{AUTH_URL, auth::get_auth_token};

#[derive(Debug, Parser, Serialize, Deserialize)]
pub struct ServiceLoginArgs {
    /// The Keycloak client ID
    #[arg(long)]
    client_id: String,

    /// The secret associated with the Keycloak client
    #[arg(long)]
    client_secret: String,
}

pub async fn service_account_login(args: ServiceLoginArgs) {
    let url = Url::parse(AUTH_URL).expect("Should be able to parse auth URL");

    let token = match get_auth_token().await {
        Ok(token) => token,
        Err(e) => {
            eprintln!("Failed to obtain authentication token: {e}");
            return;
        }
    };

    let response = match Client::new()
        .post(url)
        .bearer_auth(token.secret())
        .json(&json!({
            "client_id": args.client_id,
            "client_secret": args.client_secret,
        }))
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            eprintln!("Request failed: {e}");
            return;
        }
    };

    let status = response.status();
    let body = response.text().await.unwrap_or_default();

    if status.is_success() {
        println!("Successfully authenticated as service account");
    } else if body.is_empty() {
        eprintln!("Authentication failed: {status}");
    } else {
        eprintln!("Authentication failed ({status}): {body}");
    }
}
