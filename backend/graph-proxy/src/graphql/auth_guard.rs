use std::fmt::Display;

use async_graphql::{Context, Error, ErrorExtensions, Guard, Result};

use crate::validate_token::ValidatedAuthToken;

/// Checks that OIDC authn token is valid
pub struct AuthGuard;

/// Error codes returned on authentication failure
pub enum AuthErrorCode {
    /// Users bearer token could not be validated
    Unauthenticated,
}

impl Guard for AuthGuard {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        let auth = ctx.data::<ValidatedAuthToken>().map_err(|_| {
            Error::new("Authentication context missing")
                .extend_with(|_, e| e.set("code", "UNAUTHENTICATED"))
        })?;

        match auth {
            ValidatedAuthToken::Valid(_) => Ok(()),
            ValidatedAuthToken::Invalid => Err(Error::new(
                "Authentication error: Invalid token".to_string(),
            )
            .extend_with(|_, e| e.set("code", AuthErrorCode::Unauthenticated.to_string()))),
            ValidatedAuthToken::Missing => {
                Err(Error::new("Authentication error: Missing Bearer token")
                    .extend_with(|_, e| e.set("code", AuthErrorCode::Unauthenticated.to_string())))
            }
            ValidatedAuthToken::Failed(reason) => {
                Err(Error::new(format!("Authentication failed: {reason}"))
                    .extend_with(|_, e| e.set("code", AuthErrorCode::Unauthenticated.to_string())))
            }
        }
    }
}

impl Display for AuthErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            AuthErrorCode::Unauthenticated => "UNAUTHENTICATED",
        };
        write!(f, "{}", value)
    }
}
