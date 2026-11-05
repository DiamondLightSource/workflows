use auth_core::oauth2::{ClientId, ClientSecret, Scope, TokenResponse};
use auth_core::oidc::OidcClient;
use auth_core::openidconnect::reqwest::{ClientBuilder, redirect::Policy};
use auth_core::openidconnect::{IssuerUrl, core::CoreProviderMetadata};
use clap::Parser;
use serde::{Deserialize, Serialize};

use crate::{AUTH_URL, ISSUER_URL};

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
    let url = reqwest::Url::parse(AUTH_URL).expect("Should be able to parse auth URL");

    let http_client = ClientBuilder::new()
        .redirect(Policy::none())
        .build()
        .expect("Unable to create HTTP client");

    let issuer_url =
        IssuerUrl::new(ISSUER_URL.to_string()).expect("Unable to parse OIDC Issuer URL");
    let provider_metadata = CoreProviderMetadata::discover_async(issuer_url, &http_client)
        .await
        .expect("Unable to retrieve provider metadata");
    let client = OidcClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(args.client_id),
        Some(ClientSecret::new(args.client_secret)),
    );

    let token_response = client
        .exchange_client_credentials()
        .expect("Client credential flow not implemented")
        .add_scope(Scope::new("offline_access".to_string()))
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("fedid".to_string()))
        .request_async(&http_client)
        .await
        .expect("Token exchange failed");

    let response = match reqwest::Client::new()
        .post(url)
        .bearer_auth(token_response.access_token().secret())
        .json(&token_response)
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
