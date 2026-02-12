use sea_orm_migration::prelude::*;
use sea_orm::DatabaseConnection;
use crate::Result;

#[tokio::main]
async fn main() {
    cli::run_cli(migration::Migrator).await;

}

pub async fn migrate_database(connection: &DatabaseConnection) -> Result<()> {
    use migration::{Migrator, MigratorTrait};

    Migrator::up(connection, None).await?;
    Ok(())
}