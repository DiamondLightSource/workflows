pub mod config;
pub mod database;
pub mod entity;
pub mod error;
pub mod healthcheck;
pub mod oidc;
pub mod request;

pub type Result<T> = std::result::Result<T, error::Error>;
