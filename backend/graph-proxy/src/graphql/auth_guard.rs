use std::fmt::Display;

use async_graphql::{Context, Error, ErrorExtensions, Guard, Result};
use crate::graphql::validate_auth::ValidatedAuthToken;

pub struct AuthGuard;
pub enum AuthErrorCode {
    UNAUTHENTICATED
}

impl Guard for AuthGuard {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        let auth = ctx.data::<ValidatedAuthToken>().map_err(|_| "Internal Server Error")?;

        match auth {
            ValidatedAuthToken::Valid(_) => Ok(()),
            ValidatedAuthToken::Invalid(reason) => {
                Err(Error::new(format!("Authentication error: Invalid token: {}", reason))
                    .extend_with(|_, e| e.set("code", AuthErrorCode::UNAUTHENTICATED.to_string())))
            }
            ValidatedAuthToken::Missing => {
                Err(Error::new("Authentication error: Missing Bearer token")
                    .extend_with(|_, e| e.set("code", AuthErrorCode::UNAUTHENTICATED.to_string())))
            }
        }
    }
}

impl Display for AuthErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            AuthErrorCode::UNAUTHENTICATED => "UNAUTHENTICATED",
        };
        write!(f, "{}", value)
    }
}