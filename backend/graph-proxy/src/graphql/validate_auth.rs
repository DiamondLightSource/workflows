use async_graphql::{Context, Guard, Result, Error};
use axum_extra::{TypedHeader, headers::{Authorization, authorization::Bearer}};
use openidconnect::{AccessToken, ClientId, ClientSecret, IntrospectionUrl, IssuerUrl, TokenIntrospectionResponse, core::{CoreClient, CoreProviderMetadata}};


#[derive(Clone, Debug)]
pub enum ValidatedAuthToken {
    Valid(Authorization<Bearer>),
    Invalid(String),
    Missing,
}

impl ValidatedAuthToken {
    pub fn from_typed_header(authorization_header: Option<TypedHeader<Authorization<Bearer>>>) -> Self {
        return match authorization_header { 
            Some(bearer_token) => validate_token(bearer_token.0),
            None  => ValidatedAuthToken::Missing
        }
    }

    pub fn as_token(&self) -> Option<&Authorization<Bearer>> {
        match self {
            ValidatedAuthToken::Valid(authorization) => Some(authorization),
            ValidatedAuthToken::Invalid(_) => None,
            ValidatedAuthToken::Missing => None,
        }
    }
}

async fn validate_token(token: Authorization<Bearer>) -> anyhow::Result<ValidatedAuthToken> {

    let http_client = reqwest::ClientBuilder::new()
    // Following redirects opens the client up to SSRF vulnerabilities.
    .redirect(reqwest::redirect::Policy::none())
    .build()
    .expect("Client should build");

    // Use OpenID Connect Discovery to fetch the provider metadata.
    let provider_metadata = CoreProviderMetadata::discover_async(
        IssuerUrl::new("https://authn.diamond.ac.uk/realms/master/protocol/openid-connect/token".to_string())?,
        &http_client,
    )
    .await?;

    let client =
    CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new("client_id".to_string()),
        Some(ClientSecret::new("client_secret".to_string())),
    );
    
    let client = client.set_introspection_url(IntrospectionUrl::new("https://authn.diamond.ac.uk/realms/master/protocol/openid-connect/token/introspect".to_string())?);

    let introspection_response = client
        .introspect(&AccessToken::new(token.token().to_string()))
        .request_async(&reqwest::Client::new())
        .await?;
    if introspection_response.active() {
        return Ok(ValidatedAuthToken::Valid(token))
    } else {
        return Ok(ValidatedAuthToken::Invalid("Inactive token".to_string()))
    }
}
