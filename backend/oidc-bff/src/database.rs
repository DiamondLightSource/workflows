use chrono::{DateTime, Duration, FixedOffset, Utc};
//use sea_orm::{ActiveModelTrait, DatabaseConnection, Query};
use crate::{Result, auth_session_data::TokenSessionData};
use sea_orm::*;
use oidc_bff::entity;
use openidconnect::SubjectIdentifier;

pub async fn migrate_database(connection: &DatabaseConnection) -> Result<()> {
    use migration::{Migrator, MigratorTrait};

    Migrator::up(connection, None).await?;
    Ok(())
}

/// Delete a user's token from the database by subject identifier.
/// This is called during logout to revoke workflow access.
pub async fn delete_token_from_database(
    connection: &DatabaseConnection,
    subject: &SubjectIdentifier,
) -> Result<()> {
    entity::oidc_tokens::Entity::delete_many()
        .filter(entity::oidc_tokens::Column::Subject.eq(subject.as_str()))
        .exec(connection)
        .await?;
    Ok(())
}

pub async fn write_token_to_database(
    connection: &DatabaseConnection,
    token: &TokenSessionData,
    public_key: &sodiumoxide::crypto::box_::PublicKey,
) -> Result<()> {
    let encrypted_refresh_token =
        sodiumoxide::crypto::sealedbox::seal(token.refresh_token.secret().as_bytes(), public_key);
    let refresh_token_expires_at = Utc::now() + Duration::days(30); // TODO: offline_access tokens will expire if not used within 30 days. Keycloak returns the actual expiration date in the field "refresh_expires_in", we should use that
    let token_update = entity::oidc_tokens::ActiveModel {
        issuer: Set(token.issuer.to_string()),
        subject: Set(token.subject.to_string()),
        encrypted_refresh_token: Set(encrypted_refresh_token),
        expires_at: Set(Some(convert_time(refresh_token_expires_at))),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
        ..Default::default()
    };
    entity::oidc_tokens::Entity::insert(token_update)
        .on_conflict(
            sea_query::OnConflict::column(entity::oidc_tokens::Column::Subject)
                .update_columns([
                    entity::oidc_tokens::Column::Issuer,
                    entity::oidc_tokens::Column::Subject,
                    entity::oidc_tokens::Column::EncryptedRefreshToken,
                    entity::oidc_tokens::Column::ExpiresAt,
                    entity::oidc_tokens::Column::UpdatedAt,
                    // deliberately do not update CreatedAt
                ])
                .to_owned(),
        )
        .exec(connection)
        .await?;
    Ok(())
}

fn convert_time(utc_time: DateTime<Utc>) -> DateTime<FixedOffset> {
    utc_time.with_timezone(&FixedOffset::east_opt(0).unwrap())
}
