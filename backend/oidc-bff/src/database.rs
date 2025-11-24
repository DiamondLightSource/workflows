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
    let encrypted_refresh_token = token.refresh_token.secret();
    let token_update = entity::oidc_tokens::ActiveModel {
        issuer: todo!(),
        subject: todo!(),
        encrypted_refresh_token: Set(encrypted_refresh_token),
        expires_at: Set(token.),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
        ..Default::default()
    };
    entity::oidc_tokens::Entity::insert(token_update).on_conflict(
        sea_query::OnConflict::column(entity::oidc_tokens::Column::Subject)
                .update_columns([
                    entity::oidc_tokens::Column::Issuer,
                    entity::oidc_tokens::Column::Subject,
                    entity::oidc_tokens::Column::EncryptedRefreshToken,
                    entity::oidc_tokens::Column::ExpiresAt,
                    entity::oidc_tokens::Column::UpdatedAt,
                    // deliberately do not update CreatedAt
                ])
                .to_owned()
    ).exec(connection)
    .await?;
    Ok(())
}

