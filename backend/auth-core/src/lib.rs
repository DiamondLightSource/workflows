pub mod entity;
pub mod error;
pub mod healthcheck;
pub mod config;

pub type Result<T> = std::result::Result<T, error::Error>;

