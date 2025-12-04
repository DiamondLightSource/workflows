// WIP - Currently trying to get a connection to the Postgres Database. Untested.

use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres, FromRow};
use std::time::Duration;
use chrono::{DateTime, Utc};

pub type DbPool = Pool<Postgres>;

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
}

impl DatabaseConfig {
    /// Creates a new DatabaseConfig from environment variables
    /// These match the env vars defined in the Kubernetes deployment
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            host: std::env::var("DB_HOST")
                .map_err(|_| "DB_HOST environment variable not set")?,
            port: std::env::var("DB_PORT")
                .map_err(|_| "DB_PORT environment variable not set")?
                .parse()
                .map_err(|_| "DB_PORT must be a valid port number")?,
            database: std::env::var("DB_NAME")
                .map_err(|_| "DB_NAME environment variable not set")?,
            username: std::env::var("DB_USER")
                .map_err(|_| "DB_USER environment variable not set")?,
            password: std::env::var("DB_PASSWORD")
                .map_err(|_| "DB_PASSWORD environment variable not set")?,
        })
    }

    /// Builds a PostgreSQL connection URL
    pub fn connection_url(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            urlencoding::encode(&self.username),
            urlencoding::encode(&self.password),
            self.host,
            self.port,
            self.database
        )
    }
}

/// OIDC token structure matching the oidc_tokens table
#[derive(Debug, Clone, FromRow)]
pub struct OidcToken {
    pub issuer: String,
    pub subject: String,
    pub encrypted_refresh_token: Vec<u8>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl OidcToken {
    /// Fetch a token by issuer and subject
    pub async fn find(
        pool: &DbPool,
        issuer: &str,
        subject: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, Self>(
            "SELECT issuer, subject, encrypted_refresh_token, expires_at, created_at, updated_at 
             FROM oidc_tokens 
             WHERE issuer = $1 AND subject = $2"
        )
        .bind(issuer)
        .bind(subject)
        .fetch_optional(pool)
        .await
    }


    /// List all tokens for a subject
    pub async fn list_by_subject(
        pool: &DbPool,
        subject: &str,
    ) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_as::<_, Self>(
            "SELECT issuer, subject, encrypted_refresh_token, expires_at, created_at, updated_at 
             FROM oidc_tokens 
             WHERE subject = $1"
        )
        .bind(subject)
        .fetch_all(pool)
        .await
    }
}

pub async fn connect_with_config(
    config: &DatabaseConfig,
    max_connections: u32,
) -> Result<DbPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&config.connection_url())
        .await?;

    Ok(pool)
}

pub async fn connect() -> Result<DbPool, sqlx::Error> {
    let config = DatabaseConfig::from_env()
        .map_err(|e| sqlx::Error::Configuration(e.into()))?;
    
    connect_with_config(&config, 5).await
}

pub async fn test_connection(pool: &DbPool) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await?;
    
    Ok(())
}

pub async fn init() -> Result<DbPool, sqlx::Error> {
    let config = DatabaseConfig::from_env()
        .map_err(|e| sqlx::Error::Configuration(e.into()))?;
    
    tracing::info!(
        "Connecting to database at {}:{}/{}",
        config.host,
        config.port,
        config.database
    );

    let pool = connect_with_config(&config, 5).await?;
    
    test_connection(&pool).await?;
    
    tracing::info!("Database connection established successfully");
    
    Ok(pool)
}