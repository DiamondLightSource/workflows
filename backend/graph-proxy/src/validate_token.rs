use axum::http::Uri;
use axum_extra::headers::{authorization::Bearer, Authorization};
use openidconnect::{
    core::CoreClient, AccessToken, ClientId, ClientSecret, EndpointMaybeSet, EndpointNotSet,
    EndpointSet, IntrospectionUrl, IssuerUrl, TokenIntrospectionResponse,
};

use serde::{Deserialize, Serialize};

use openidconnect::{
    core::{
        CoreAuthDisplay, CoreClaimName, CoreClaimType, CoreClientAuthMethod, CoreGrantType,
        CoreJsonWebKey, CoreJweContentEncryptionAlgorithm, CoreJweKeyManagementAlgorithm,
        CoreResponseMode, CoreResponseType, CoreSubjectIdentifierType,
    },
    AdditionalProviderMetadata, ProviderMetadata,
};

#[derive(Clone, Debug, PartialEq)]
pub enum ValidatedAuthToken {
    Valid(Authorization<Bearer>),
    Invalid,
    Missing,
    Failed(String),
}

impl ValidatedAuthToken {
    pub fn as_token(&self) -> Option<&Authorization<Bearer>> {
        match self {
            ValidatedAuthToken::Valid(authorization) => Some(authorization),
            ValidatedAuthToken::Invalid => None,
            ValidatedAuthToken::Missing => None,
            ValidatedAuthToken::Failed(_) => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct TokenValidator {
    client: CoreClient<
        EndpointSet,
        EndpointNotSet,
        EndpointSet,
        EndpointNotSet,
        EndpointMaybeSet,
        EndpointMaybeSet,
    >,
}

impl TokenValidator {
    pub async fn new(
        oidc_issuer_url: impl Into<&Uri>,
        oidc_client_id: impl Into<String>,
        oidc_client_secret: impl Into<Option<String>>,
    ) -> anyhow::Result<Self> {
        let http_client = reqwest::ClientBuilder::new()
            // Following redirects opens the client up to SSRF vulnerabilities.
            .redirect(reqwest::redirect::Policy::none())
            .build()?;
        let oidc_issuer_url = oidc_issuer_url.into();
        // Use OpenID Connect Discovery to fetch the provider metadata.
        let provider_metadata = ProviderMetadataWithInstrospectionEndpoint::discover_async(
            IssuerUrl::new(oidc_issuer_url.to_string())?,
            &http_client,
        )
        .await?;

        let introspection_endpoint = &provider_metadata
            .additional_metadata()
            .introspection_endpoint;
        let introspection_endpoint = if let Some(introspection_endpoint) = introspection_endpoint {
            introspection_endpoint.clone()
        } else {
            format!("{oidc_issuer_url}/protocol/openid-connect/token/introspect").to_string()
        };

        let client = CoreClient::from_provider_metadata(
            provider_metadata,
            ClientId::new(oidc_client_id.into()),
            oidc_client_secret.into().map(ClientSecret::new),
        );

        let client = client.set_introspection_url(IntrospectionUrl::new(introspection_endpoint)?);

        Ok(Self { client })
    }

    pub async fn validate_token<T>(&self, authorization_header: Option<T>) -> ValidatedAuthToken
    where
        T: Into<Authorization<Bearer>>,
    {
        let authorization_header = authorization_header.map(Into::into);
        match authorization_header {
            Some(bearer_token) => self.validate_some_token(bearer_token).await,
            None => ValidatedAuthToken::Missing,
        }
    }

    async fn validate_some_token(&self, token: Authorization<Bearer>) -> ValidatedAuthToken {
        let introspection_response = self
            .client
            .introspect(&AccessToken::new(token.token().to_string()))
            .request_async(&reqwest::Client::new())
            .await;

        match introspection_response {
            Ok(introspection_response) => {
                if introspection_response.active() {
                    ValidatedAuthToken::Valid(token)
                } else {
                    ValidatedAuthToken::Invalid
                }
            }
            Err(err) => ValidatedAuthToken::Failed(err.to_string()),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct IntrospectionEndpointProviderMetadata {
    // Make it optional so discovery doesn't fail for providers that don't publish it.
    introspection_endpoint: Option<String>,
}
impl AdditionalProviderMetadata for IntrospectionEndpointProviderMetadata {}

type ProviderMetadataWithInstrospectionEndpoint = ProviderMetadata<
    IntrospectionEndpointProviderMetadata,
    CoreAuthDisplay,
    CoreClientAuthMethod,
    CoreClaimName,
    CoreClaimType,
    CoreGrantType,
    CoreJweContentEncryptionAlgorithm,
    CoreJweKeyManagementAlgorithm,
    CoreJsonWebKey,
    CoreResponseMode,
    CoreResponseType,
    CoreSubjectIdentifierType,
>;

#[cfg(test)]
mod tests {

    use std::time::Duration;

    use anyhow::Context;
    use axum::http::Uri;
    use axum_extra::headers::Authorization;
    use testcontainers::core::wait::HttpWaitStrategy;
    use testcontainers::core::WaitFor;
    use testcontainers::runners::AsyncRunner;
    use testcontainers::{GenericImage, ImageExt};

    use crate::validate_token::{TokenValidator, ValidatedAuthToken};

    #[tokio::test]
    async fn test_token_validator() -> anyhow::Result<()> {
        if std::env::var("WORKFLOWS_DEV_CONTAINER").is_ok() {
            eprintln!("Skipping test: running inside dev container");
            return Ok(());
        }

        let wait_strategy = HttpWaitStrategy::new("default/.well-known/openid-configuration")
            .with_expected_status_code(200u16);
        let oidc_container = GenericImage::new("ghcr.io/navikt/mock-oauth2-server", "3.0.1")
            .with_wait_for(WaitFor::http(wait_strategy))
            .with_env_var("SERVER_PORT", "8080")
            .with_startup_timeout(Duration::from_secs(60))
            .start()
            .await
            .expect("failed to start mock OIDC server");
        let port = oidc_container.get_host_port_ipv4(8080).await?;
        let host = oidc_container.get_host().await?;
        let mock_admin_url = format!("http://{}:{}/default/token", host, port);
        let params = [
            ("grant_type", "client_credentials"),
            ("scope", "openid"),
            ("subject", "test-subject"),
            ("client_id", "test-client"),
            ("client_secret", "test-secret"),
        ];

        let response: serde_json::Value = reqwest::Client::new()
            .post(mock_admin_url)
            .timeout(Duration::from_secs(10))
            .form(&params)
            .send()
            .await?
            .json()
            .await?;
        println!("{}", response);
        let access_token = response
            .get("access_token")
            .context("no access token")?
            .as_str()
            .context("invalid access token")?;
        let access_token = Authorization::bearer(access_token)?;
        let issuer_url = format!("http://{}:{}/default", host, port).parse::<Uri>()?;

        let token_validator =
            TokenValidator::new(&issuer_url, "test-client", Some("test-secret".to_string()))
                .await?;

        let authenticated_token = token_validator
            .validate_token(Some(access_token.clone()))
            .await;

        assert_eq!(ValidatedAuthToken::Valid(access_token), authenticated_token);

        oidc_container.stop_with_timeout(Some(60)).await?;
        Ok(())
    }
}
