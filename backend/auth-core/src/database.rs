use chrono::{DateTime, Duration, FixedOffset, Utc};
use openidconnect::SubjectIdentifier;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set, sea_query};
use sodiumoxide::crypto::box_::{PublicKey, SecretKey};
use tracing::info;

use crate::Result;
use crate::entity;

pub trait RefreshTokenInfo {
    fn refresh_token_secret(&self) -> &str;
    fn issuer(&self) -> &str;
    fn subject(&self) -> &str;
}

pub struct StoredToken {
    pub issuer: String,
    pub subject: String,
    pub refresh_token_secret: String,
}

pub async fn migrate_database(connection: &DatabaseConnection) -> Result<()> {
    use migration::{Migrator, MigratorTrait};

    Migrator::up(connection, None).await?;
    Ok(())
}

pub async fn read_token_from_database(
    connection: &DatabaseConnection,
    subject: &SubjectIdentifier,
    issuer: Option<&str>,
    public_key: &PublicKey,
    secret_key: &SecretKey,
) -> Result<StoredToken> {
    info!(subject = subject.as_str(), "Fetching token from database");
    // Build query: filter by Subject (and Issuer if provided)
    let mut query = entity::oidc_tokens::Entity::find()
        .filter(entity::oidc_tokens::Column::Subject.eq(subject.as_str()));

    if let Some(iss) = issuer {
        query = query.filter(entity::oidc_tokens::Column::Issuer.eq(iss));
    }

    let row = query.one(connection).await?.ok_or_else(|| {
        anyhow::anyhow!(
            "No token row found for subject='{}' issuer={:?}",
            subject.as_str(),
            issuer
        )
    })?;

    // Decrypt sealed box
    let ciphertext = row.encrypted_refresh_token;
    let decrypted = sodiumoxide::crypto::sealedbox::open(&ciphertext, public_key, secret_key)
        .map_err(|_| anyhow::anyhow!("Unable to decrypt refresh token (sealedbox::open failed)"))?;

    // Check when token expires
    let expires_at_utc = match row.expires_at {
        Some(dt) => to_utc(dt),
        None => {
            // If not stored, decide on a policy: here we treat as "no expiry"
            // You can choose to error instead.
            Utc::now()
        }
    };
    if expires_at_utc < Utc::now() {
        Err(anyhow::anyhow!(
            "Stored refresh token has expired at {}",
            expires_at_utc
        ))?;
    }

    // Return Stored Token
    let stored = StoredToken {
        issuer: row.issuer,
        subject: row.subject,
        refresh_token_secret: String::from_utf8(decrypted)?,
    };

    info!(
        subject = stored.subject.as_str(),
        "Fetched token from database successfully"
    );
    Ok(stored)
}

pub async fn write_token_to_database(
    connection: &DatabaseConnection,
    token: &impl RefreshTokenInfo,
    public_key: &PublicKey,
) -> Result<()> {
    let encrypted_refresh_token =
        sodiumoxide::crypto::sealedbox::seal(token.refresh_token_secret().as_bytes(), public_key);
    let refresh_token_expires_at = Utc::now() + Duration::days(30); // TODO: offline_access tokens will expire if not used within 30 days. Keycloak returns the actual expiration date in the field "refresh_expires_in", we should use that
    let token_update = entity::oidc_tokens::ActiveModel {
        issuer: Set(token.issuer().to_string()),
        subject: Set(token.subject().to_string()),
        encrypted_refresh_token: Set(encrypted_refresh_token),
        expires_at: Set(Some(convert_time(refresh_token_expires_at))),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
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

fn convert_time(utc_time: DateTime<Utc>) -> DateTime<FixedOffset> {
    utc_time.with_timezone(&FixedOffset::east_opt(0).unwrap())
}

fn to_utc(dt: DateTime<FixedOffset>) -> DateTime<Utc> {
    dt.with_timezone(&Utc)
}
