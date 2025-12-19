use chrono::{DateTime, Duration, FixedOffset, Utc};
use oauth2::RefreshToken;
use openidconnect::{IssuerUrl, SubjectIdentifier};
use sea_orm::{ActiveModelTrait, DatabaseConnection};
use crate::{Result, state::TokenData};
use sea_orm::*;
use oidc_bff::entity;
use oidc_bff::entity::oidc_tokens::ActiveModel;

pub async fn write_token_to_database(
    connection: &DatabaseConnection,
    token: &TokenData,
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


/// Convert DB stored FixedOffset time to Utc
fn to_utc(dt: DateTime<FixedOffset>) -> DateTime<Utc> {
    dt.with_timezone(&Utc)
}

pub async fn read_token_from_database(
    connection: &DatabaseConnection,
    subject: &SubjectIdentifier,
    issuer: Option<&IssuerUrl>,
    public_key: &sodiumoxide::crypto::box_::PublicKey,
    secret_key: &sodiumoxide::crypto::box_::SecretKey,
) -> Result<TokenData> {
    println!("Fetching token from database for subject {}", subject.as_str());
    // Build query: filter by Subject (and Issuer if provided)
    let mut query = entity::oidc_tokens::Entity::find()
        .filter(entity::oidc_tokens::Column::Subject.eq(subject.as_str()));

    if let Some(iss) = issuer {
        query = query.filter(entity::oidc_tokens::Column::Issuer.eq(iss.as_str()));
    }

    let row = query.one(connection).await?
        .ok_or_else(|| anyhow::anyhow!("No token row found for subject='{}' issuer={:?}", subject.as_str(), issuer))?;

    // Decrypt sealed box
    let ciphertext = row.encrypted_refresh_token;
    let decrypted = sodiumoxide::crypto::sealedbox::open(&ciphertext, public_key, secret_key)
        .map_err(|_| anyhow::anyhow!("Unable to decrypt refresh token (sealedbox::open failed)"))?;

    let expires_at_utc = match row.expires_at {
        Some(dt) => to_utc(dt),
        None => {
            // If not stored, decide on a policy: here we treat as "no expiry"
            // You can choose to error instead.
            Utc::now()
        }
    };

    if expires_at_utc < Utc::now() {
        Err(anyhow::anyhow!("Stored refresh token has expired at {}", expires_at_utc))?;
    }

    let issuer = IssuerUrl::new(row.issuer)?;
    let subject = SubjectIdentifier::new(row.subject);
    let refresh_token = RefreshToken::new(String::from_utf8(decrypted)?);
    let token = TokenData::new(
        issuer,
        subject,
        None,
        Utc::now(),
        refresh_token

    );
    println!("Fetching token from database for subject {}: success", token.subject.as_str());
    Ok(token)
}
