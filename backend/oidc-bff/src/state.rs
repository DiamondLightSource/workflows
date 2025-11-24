use oauth2::{ClientId, ClientSecret, EndpointMaybeSet, EndpointNotSet, EndpointSet, reqwest};
use openidconnect::IssuerUrl;
use openidconnect::core::{CoreClient, CoreProviderMetadata};
use serde::{Deserialize, Serialize};

use crate::Result;
use crate::config::Config;

#[derive(Debug, Clone)]
pub struct AppState {
    pub config: Config,
    http_client: reqwest::Client,
    oidc_client: openidconnect::core::CoreClient<
        EndpointSet,
        EndpointNotSet,
        EndpointNotSet,
        EndpointNotSet,
        EndpointMaybeSet,
        EndpointMaybeSet,
    >,
}

impl AppState {
    pub async fn new(config: Config) -> Result<Self> {
        let http_client = reqwest::ClientBuilder::new()
            // Following redirects opens the client up to SSRF vulnerabilities.
            .redirect(reqwest::redirect::Policy::none())
            .build()?;

        // Use OpenID Connect Discovery to fetch the provider metadata.
        let provider_metadata = CoreProviderMetadata::discover_async(
            IssuerUrl::new(config.oidc_provider_url.to_string())?,
            &http_client,
        )
        .await?;

        let oidc_client = CoreClient::from_provider_metadata(
            provider_metadata,
            ClientId::new(config.client_id.to_string()),
            if config.client_secret.is_empty() {
                None
            } else {
                Some(ClientSecret::new(config.client_secret.to_string()))
            },
        );

        Ok(AppState {
            config,
            http_client,
            oidc_client,
        })
    }
}
