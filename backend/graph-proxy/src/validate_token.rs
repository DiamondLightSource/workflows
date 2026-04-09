use async_graphql::{Context, Error, Guard, Result};
use axum::http::Uri;
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use openidconnect::{
    core::{CoreClient, CoreProviderMetadata},
    AccessToken, ClientId, ClientSecret, EndpointMaybeSet, EndpointNotSet, EndpointSet,
    IntrospectionUrl, IssuerUrl, TokenIntrospectionResponse,
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
    http_client: reqwest::Client,
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
        let provider_metadata = CoreProviderMetadata::discover_async(
            IssuerUrl::new(oidc_issuer_url.to_string())?,
            &http_client,
        )
        .await?;

        let client = CoreClient::from_provider_metadata(
            provider_metadata,
            ClientId::new(oidc_client_id.into()),
            oidc_client_secret.into().map(ClientSecret::new),
        );

        let client = client.set_introspection_url(IntrospectionUrl::new(
            format!("{oidc_issuer_url}/protocol/openid-connect/token/introspect").to_string(),
        )?);

        Ok(Self {
            http_client,
            client,
        })
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

#[cfg(test)]
mod tests {

    use std::time::Duration;

    use anyhow::Context;
    use axum::http::Uri;
    use axum_extra::headers::Authorization;
    use testcontainers::core::wait::HttpWaitStrategy;
    use testcontainers::core::{IntoContainerPort, WaitFor};
    use testcontainers::runners::AsyncRunner;
    use testcontainers::{GenericImage, ImageExt};

    use crate::validate_token::{TokenValidator, ValidatedAuthToken};

    #[tokio::test]
    async fn test_token_validator() -> anyhow::Result<()> {
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

        let mock_admin_url = format!("http://localhost:{}/default/token", port);
        let params = [
            ("grant_type", "refresh_token"),
            ("scope", "openid offline_access"),
            ("subject", "test-subject"),
            ("refresh_token", "test-refresh-token"),
            ("client_id", "test-client"),
        ];

        let response: serde_json::Value = reqwest::Client::new()
            .post(mock_admin_url)
            .timeout(Duration::from_secs(10))
            .form(&params)
            .send()
            .await?
            .json()
            .await?;
        let access_token = response
            .get("access_token")
            .context("no access token")?
            .as_str()
            .context("invalid access token")?;
        let access_token = Authorization::bearer(access_token)?;
        let issuer_url = format!("http://localhost:{}/default", port).parse::<Uri>()?;

        let token_validator = TokenValidator::new(&issuer_url, "test-client", None).await?;

        let authenticated_token = token_validator
            .validate_token(Some(access_token.clone()))
            .await;

        assert_eq!(ValidatedAuthToken::Valid(access_token), authenticated_token);

        oidc_container.stop_with_timeout(Some(60)).await?;
        Ok(())
    }
}
