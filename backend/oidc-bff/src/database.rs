//! Database operations for oidc-bff.
//! Re-exports shared database functions from auth-common and provides BFF-specific migration.

// Re-export shared database functions
pub use auth_common::database::{
    write_token_to_database,
    delete_token_from_database,
};
