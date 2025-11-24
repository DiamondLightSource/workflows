use chrono::{DateTime, Utc};
//use sea_orm::{ActiveModelTrait, DatabaseConnection, Query};
use sea_orm::*;
use crate::{Result, auth_session_data::TokenSessionData, entity};

pub async fn migrate_database(connection: &DatabaseConnection) -> Result<()> {
    use migration::{Migrator, MigratorTrait};

    Migrator::up(connection, None).await?;
    Ok(())
}

pub async fn write_token_to_database(connection: &DatabaseConnection, token: TokenSessionData) -> Result<()> {
    let token_update = entity::oidc_tokens::ActiveModel {
        ..Default::default()
    };
    token_update.insert(connection).on_conflict():
    .await?;
    Ok(())
}

