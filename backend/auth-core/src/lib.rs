pub mod config;
pub mod database;
pub mod entity;
pub mod error;
pub mod healthcheck;
pub mod middleware;
pub mod oidc;
pub mod request;
pub use async_trait;
pub use base64;
pub use oauth2;
pub use openidconnect;
pub use rustls;
pub use sea_orm;
pub use sodiumoxide;

pub type Result<T> = std::result::Result<T, error::Error>;
