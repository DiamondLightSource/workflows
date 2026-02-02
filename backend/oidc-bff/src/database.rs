//! Database operations for oidc-bff.
//! Re-exports shared database functions from auth-common and provides BFF-specific migration.

use crate::Result;
use sea_orm::DatabaseConnection;

// Re-export shared database functions
pub use auth_common::database::{
    write_token_to_database,
    delete_token_from_database,
};

pub async fn migrate_database(connection: &DatabaseConnection) -> Result<()> {
    use migration::{Migrator, MigratorTrait};

    Migrator::up(connection, None).await?;
    Ok(())
}
