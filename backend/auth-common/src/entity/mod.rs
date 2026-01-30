//! SeaORM entities for authentication services.
//!
//! This module provides the database entities used by both `oidc-bff` and `auth-daemon`
//! for storing OIDC tokens.

pub mod oidc_tokens;
pub use super::oidc_tokens::Entity as OidcTokens;
