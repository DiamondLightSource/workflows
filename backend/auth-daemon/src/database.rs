//! Database operations for auth-daemon.
//! Re-exports shared database functions from auth-common.

pub use auth_common::database::{
    read_token_from_database,
    write_token_to_database,
    delete_token_from_database,
};
