use axum::http::Uri;
use axum_extra::headers::{authorization::Bearer, Authorization};
use jsonwebtoken::{decode, decode_header, jwk::JwkSet, Algorithm, DecodingKey, Validation};
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
use serde_json::Value;

#[derive(Debug, Clone, PartialEq)]
/// Method of token validation
pub enum ValidationMethod {
    /// Use OIDC provider introspection end-point
    #[allow(dead_code)]
    Introspection,
    /// Use local validation of the JWT
    Jwt,
}

/// Validated Tokens (including those found to be invalid)
#[derive(Clone, Debug, PartialEq)]
pub enum ValidatedAuthToken {
    /// A token that passed validation
    Valid(Authorization<Bearer>),
    /// A token that was deemed invalid or expired by the OIDC issuer
    Invalid,
    /// No token was provided
    Missing,
    /// Error message for unexpected token validation failure
    Failed(String),
}

impl ValidatedAuthToken {
    /// Convert the token back to Authorization<Bearer>
    ///
    /// Only valid tokens will be returned.
    /// Returns None for invalid or expired tokens.
    pub fn as_token(&self) -> Option<&Authorization<Bearer>> {
        match self {
            ValidatedAuthToken::Valid(authorization) => Some(authorization),
            ValidatedAuthToken::Invalid => None,
            ValidatedAuthToken::Missing => None,
            ValidatedAuthToken::Failed(_) => None,
        }
    }
}

/// Checks OIDC access_tokens are valid
#[derive(Debug, Clone)]
pub struct TokenValidator {
    /// Client used to connect to OAuth2 introspection end-point
    client: CoreClient<
        EndpointSet,
        EndpointNotSet,
        EndpointSet,
        EndpointNotSet,
        EndpointMaybeSet,
        EndpointMaybeSet,
    >,
    /// OIDC issuer keys
    json_web_key_set: JwkSet,
    /// JWT validation configuration
    jwt_validation: Validation,
}

impl TokenValidator {
    /// Create a TokenValidator
    ///
    /// Retrieves the issuer .well-known end-point so should not be done on every query.
    ///
    /// Client secret is optional (eg in case of public clients)
    pub async fn new(
        oidc_issuer_url: impl Into<&Uri>,
        oidc_client_id: impl Into<String>,
        oidc_client_secret: impl Into<Option<String>>,
        audiences: impl IntoIterator<Item = impl AsRef<str>>,
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

        let jwks_uri = provider_metadata.jwks_uri().to_string();

        let json_web_key_set = http_client
            .get(&jwks_uri)
            .send()
            .await
            .and_then(|r| r.error_for_status())?
            .json::<JwkSet>()
            .await?;

        let mut jwt_validation = Validation::new(Algorithm::RS256);
        jwt_validation.set_issuer(&[provider_metadata.issuer()]);
        let audiences: Vec<_> = audiences
            .into_iter()
            .map(|s| s.as_ref().trim().to_owned())
            .filter(|s| !s.is_empty())
            .collect();
        jwt_validation.set_audience(&audiences);
        jwt_validation.leeway = 60;

        let client = CoreClient::from_provider_metadata(
            provider_metadata,
            ClientId::new(oidc_client_id.into()),
            oidc_client_secret.into().map(ClientSecret::new),
        );

        let client = client.set_introspection_url(IntrospectionUrl::new(introspection_endpoint)?);

        Ok(Self {
            client,
            json_web_key_set,
            jwt_validation,
        })
    }

    /// Validate token using provided method
    pub async fn validate_token<T>(
        &self,
        authorization_header: Option<T>,
        method: ValidationMethod,
    ) -> ValidatedAuthToken
    where
        T: Into<Authorization<Bearer>>,
    {
        let authorization_header = authorization_header.map(Into::into);
        match (authorization_header, method) {
            (Some(bearer_token), ValidationMethod::Introspection) => {
                self.validate_token_with_introspection(bearer_token).await
            }
            (Some(bearer_token), ValidationMethod::Jwt) => {
                self.validate_token_with_jwt(bearer_token)
            }
            (None, _) => ValidatedAuthToken::Missing,
        }
    }

    /// Validate token with OIDC issuer instrospection end-point
    async fn validate_token_with_introspection(
        &self,
        token: Authorization<Bearer>,
    ) -> ValidatedAuthToken {
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

    /// Validate token locally by inspecting JWT
    fn validate_token_with_jwt(&self, token: Authorization<Bearer>) -> ValidatedAuthToken {
        let jwt = token.token();

        let key_id = match decode_header(jwt) {
            Ok(header) => header.kid,
            Err(_) => return ValidatedAuthToken::Invalid,
        };

        let key_id = match key_id {
            Some(key_id) => key_id,
            None => return ValidatedAuthToken::Invalid,
        };

        let jwk = match self
            .json_web_key_set
            .keys
            .iter()
            .find(|k| k.common.key_id.as_deref() == Some(&key_id))
        {
            Some(k) => k,
            None => return ValidatedAuthToken::Invalid,
        };

        let decoding_key = match DecodingKey::from_jwk(jwk) {
            Ok(decoding_key) => decoding_key,
            Err(err) => return ValidatedAuthToken::Failed(format!("Unsupported JWK: {err}")),
        };

        match decode::<Value>(jwt, &decoding_key, &self.jwt_validation) {
            Ok(_) => ValidatedAuthToken::Valid(token),
            Err(_) => ValidatedAuthToken::Invalid,
        }
    }
}

/// Extend OIDC ProviderMetadata to retrieve introspection_endpoint
#[derive(Clone, Debug, Deserialize, Serialize)]
struct IntrospectionEndpointProviderMetadata {
    /// Introspection_endpoint (optional as not all OIDC issuers provide it)
    // An extension is neccessary as openidconnect-rs does not currently handle this
    // see: https://github.com/ramosbugs/openidconnect-rs/issues/141
    introspection_endpoint: Option<String>,
}
impl AdditionalProviderMetadata for IntrospectionEndpointProviderMetadata {}

/// The concrete type returned by OIDC discovery  
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
    use rstest::rstest;
    use testcontainers::core::wait::HttpWaitStrategy;
    use testcontainers::core::WaitFor;
    use testcontainers::runners::AsyncRunner;
    use testcontainers::{GenericImage, ImageExt};

    use super::{TokenValidator, ValidatedAuthToken, ValidationMethod};

    #[tokio::test]
    #[rstest]
    #[case(ValidationMethod::Introspection)]
    #[case(ValidationMethod::Jwt)]
    async fn test_token_validator(#[case] method: ValidationMethod) -> anyhow::Result<()> {
        if std::env::var("WORKFLOWS_DEV_CONTAINER").is_ok() {
            eprintln!("Skipping test: test containers don't work inside VSCode dev container");
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
        let access_token = response
            .get("access_token")
            .context("no access token")?
            .as_str()
            .context("invalid access token")?;
        let access_token = Authorization::bearer(access_token)?;
        let issuer_url = format!("http://{}:{}/default", host, port).parse::<Uri>()?;

        let token_validator = TokenValidator::new(
            &issuer_url,
            "test-client",
            Some("test-secret".to_string()),
            vec!["workflows-cluster"],
        )
        .await?;

        let authenticated_token = token_validator
            .validate_token(Some(access_token.clone()), method)
            .await;

        assert_eq!(ValidatedAuthToken::Valid(access_token), authenticated_token);

        oidc_container.stop_with_timeout(Some(60)).await?;
        Ok(())
    }
}
