//! Database operations for token storage.
//!
//! Tokens are encrypted using libsodium sealed boxes before storage.

use chrono::{DateTime, Duration, FixedOffset, Utc};
use oauth2::RefreshToken;
use openidconnect::{IssuerUrl, SubjectIdentifier};
use sea_orm::*;
use sodiumoxide::crypto::box_::{PublicKey, SecretKey};

use crate::entity::oidc_tokens;
use crate::{Result, TokenData};

/// Delete a user's token from the database by subject identifier.
/// This is called during logout to revoke workflow access.
pub async fn delete_token_from_database(
    connection: &DatabaseConnection,
    subject: &SubjectIdentifier,
) -> Result<()> {
    oidc_tokens::Entity::delete_many()
        .filter(oidc_tokens::Column::Subject.eq(subject.as_str()))
        .exec(connection)
        .await?;
    tracing::info!(subject = %subject.as_str(), "Deleted token from database");
    Ok(())
}

/// Write (or update) a token to the database.
/// The refresh token is encrypted using a sealed box before storage.
pub async fn write_token_to_database(
    connection: &DatabaseConnection,
    token: &TokenData,
    public_key: &PublicKey,
) -> Result<()> {
    let encrypted_refresh_token =
        sodiumoxide::crypto::sealedbox::seal(token.refresh_token.secret().as_bytes(), public_key);
    
    // TODO: offline_access tokens will expire if not used within 30 days.
    // Keycloak returns the actual expiration date in the field "refresh_expires_in",
    // we should use that instead of hardcoding 30 days.
    let refresh_token_expires_at = Utc::now() + Duration::days(30);
    
    let token_update = oidc_tokens::ActiveModel {
        issuer: Set(token.issuer.to_string()),
        subject: Set(token.subject.to_string()),
        encrypted_refresh_token: Set(encrypted_refresh_token),
        expires_at: Set(Some(convert_time(refresh_token_expires_at))),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
        ..Default::default()
    };
    
    oidc_tokens::Entity::insert(token_update)
        .on_conflict(
            sea_query::OnConflict::column(oidc_tokens::Column::Subject)
                .update_columns([
                    oidc_tokens::Column::Issuer,
                    oidc_tokens::Column::Subject,
                    oidc_tokens::Column::EncryptedRefreshToken,
                    oidc_tokens::Column::ExpiresAt,
                    oidc_tokens::Column::UpdatedAt,
                    // deliberately do not update CreatedAt
                ])
                .to_owned(),
        )
        .exec(connection)
        .await?;
    
    tracing::debug!(subject = %token.subject.as_str(), "Wrote token to database");
    Ok(())
}

/// Read and decrypt a token from the database.
/// Requires both public and secret keys for decryption.
pub async fn read_token_from_database(
    connection: &DatabaseConnection,
    subject: &SubjectIdentifier,
    issuer: Option<&IssuerUrl>,
    public_key: &PublicKey,
    secret_key: &SecretKey,
) -> Result<TokenData> {
    tracing::debug!(subject = %subject.as_str(), "Fetching token from database");
    
    // Build query: filter by Subject (and Issuer if provided)
    let mut query = oidc_tokens::Entity::find()
        .filter(oidc_tokens::Column::Subject.eq(subject.as_str()));

    if let Some(iss) = issuer {
        query = query.filter(oidc_tokens::Column::Issuer.eq(iss.as_str()));
    }

    let row = query.one(connection).await?
        .ok_or_else(|| anyhow::anyhow!(
            "No token row found for subject='{}' issuer={:?}", 
            subject.as_str(), 
            issuer
        ))?;

    // Decrypt sealed box
    let ciphertext = row.encrypted_refresh_token;
    let decrypted = sodiumoxide::crypto::sealedbox::open(&ciphertext, public_key, secret_key)
        .map_err(|_| anyhow::anyhow!("Unable to decrypt refresh token (sealedbox::open failed)"))?;

    let expires_at_utc = match row.expires_at {
        Some(dt) => to_utc(dt),
        None => Utc::now(), // Treat missing expiry as already expired
    };

    if expires_at_utc < Utc::now() {
        return Err(anyhow::anyhow!("Stored refresh token has expired at {}", expires_at_utc).into());
    }

    let issuer = IssuerUrl::new(row.issuer)?;
    let subject = SubjectIdentifier::new(row.subject);
    let refresh_token = RefreshToken::new(String::from_utf8(decrypted)?);
    
    let token = TokenData::new(
        issuer,
        subject.clone(),
        None, // Access token will be obtained on first request
        Utc::now(),
        refresh_token,
    );
    
    tracing::debug!(subject = %subject.as_str(), "Successfully read token from database");
    Ok(token)
}

/// Convert UTC time to FixedOffset (for database storage)
fn convert_time(utc_time: DateTime<Utc>) -> DateTime<FixedOffset> {
    utc_time.with_timezone(&FixedOffset::east_opt(0).unwrap())
}

/// Convert DB stored FixedOffset time to Utc
fn to_utc(dt: DateTime<FixedOffset>) -> DateTime<Utc> {
    dt.with_timezone(&Utc)
}
