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

#[derive(Clone, Debug)]
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
        oidc_client_secret: Option<impl Into<String>>,
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
            oidc_client_secret.map(Into::into).map(ClientSecret::new),
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

    #[tokio::test]
    async fn test_token_validator() {}
}
