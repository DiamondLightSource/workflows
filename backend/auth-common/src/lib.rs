//! # auth-common
//!
//! Shared authentication logic for the `oidc-bff` and `auth-daemon` services.
//!
//! This crate provides:
//! - Common error types
//! - Token data structures
//! - Database entities for token storage
//! - Database operations for token storage
//! - HTTP utilities for request manipulation
//! - Configuration loading helpers

pub mod config;
pub mod database;
pub mod entity;
pub mod error;
pub mod http_utils;
pub mod token;

pub use entity::oidc_tokens;
pub use error::Error;
pub use token::TokenData;

/// Common Result type using the shared Error
pub type Result<T> = std::result::Result<T, Error>;
