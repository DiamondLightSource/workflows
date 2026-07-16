use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use moka::future::Cache;
use tokio::sync::Mutex;

use auth_core::database::RefreshTokenInfo;
use auth_core::oauth2::{RefreshToken, TokenResponse};
use auth_core::oidc::{
    DbConnection, HttpClient, OidcClient, SodiumPublicKey, create_db_connection,
    create_oidc_client, decode_public_key, decode_secret_key, exchange_refresh_token,
};
use auth_core::openidconnect::{IssuerUrl, SubjectIdentifier};
use auth_core::sodiumoxide::crypto::box_::SecretKey;

use crate::config::AuthBrokerConfig;
use crate::k8s::{K8sApi, RealK8sApi};

type Result<T> = auth_core::Result<T>;

const TOKEN_GRACE_PERIOD_SECS: i64 = 30;
const DEFAULT_TOKEN_EXPIRY_SECS: u64 = 60;
const SUBJECT_CACHE_TTL_SECS: u64 = 300;
const TOKEN_CACHE_TTL_SECS: u64 = 300;
const TOKEN_CACHE_MAX_CAPACITY: u64 = 1000000;
const SUBJECT_CACHE_MAX_CAPACITY: u64 = 1000000;

#[derive(Clone)]
struct CachedToken {
    access_token: String,
    expires_at: DateTime<Utc>,
    refresh_token: String,
    issuer: IssuerUrl,
    subject: String,
}

impl RefreshTokenInfo for CachedToken {
    fn refresh_token_secret(&self) -> &str {
        &self.refresh_token
    }
    fn issuer(&self) -> &str {
        self.issuer.as_str()
    }
    fn subject(&self) -> &str {
        &self.subject
    }
}

pub struct AuthBrokerState {
    http_client: HttpClient,
    oidc_client: OidcClient,
    database_connection: DbConnection,
    pub k8s: Arc<dyn K8sApi>,
    public_key: SodiumPublicKey,
    secret_key: SecretKey,
    subject_cache: Cache<String, String>,
    token_cache: Cache<String, CachedToken>,
    refresh_locks: Arc<DashMap<String, Arc<Mutex<()>>>>,
}

impl AuthBrokerState {
    pub async fn new(config: AuthBrokerConfig) -> Result<Arc<Self>> {
        let database_connection = create_db_connection(&config.common).await?;
        let kube_client = kube::Client::try_default()
            .await
            .map_err(|err| anyhow::anyhow!("failed to create Kubernetes client: {err}"))?;
        let k8s = Arc::new(RealK8sApi::new(
            kube_client,
            config.token_review_audience.clone(),
        ));
        Self::with_k8s_and_db(config, k8s as Arc<dyn K8sApi>, database_connection).await
    }

    pub async fn with_k8s_and_db(
        config: AuthBrokerConfig,
        k8s: Arc<dyn K8sApi>,
        database_connection: impl Into<DbConnection>,
    ) -> Result<Arc<Self>> {
        let (oidc_client, http_client) = create_oidc_client(&config.common).await?;
        let public_key = decode_public_key(&config.common.encryption_public_key)?;
        let secret_key = decode_secret_key(&config.encryption_private_key)?;
        let database_connection = database_connection.into();

        let token_cache = Cache::builder()
            .time_to_live(Duration::from_secs(TOKEN_CACHE_TTL_SECS))
            .max_capacity(TOKEN_CACHE_MAX_CAPACITY)
            .build();

        let refresh_locks: Arc<DashMap<String, Arc<Mutex<()>>>> = Arc::new(DashMap::new());

        let cleanup_locks = refresh_locks.clone();
        let cleanup_cache = token_cache.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(60)).await;
                let mut stale = Vec::new();
                for entry in cleanup_locks.iter() {
                    if cleanup_cache.get(entry.key()).await.is_none() {
                        stale.push(entry.key().clone());
                    }
                }
                for key in stale {
                    cleanup_locks.remove(&key);
                }
            }
        });

        Ok(Arc::new(Self {
            http_client,
            oidc_client,
            database_connection,
            k8s,
            public_key,
            secret_key,
            subject_cache: Cache::builder()
                .time_to_live(Duration::from_secs(SUBJECT_CACHE_TTL_SECS))
                .max_capacity(SUBJECT_CACHE_MAX_CAPACITY)
                .build(),
            token_cache,
            refresh_locks,
        }))
    }

    pub async fn get_or_refresh_token(&self, subject: &str) -> Result<String> {
        if let Some(token) = self.token_cache.get(subject).await {
            let grace = Utc::now() + chrono::Duration::seconds(TOKEN_GRACE_PERIOD_SECS);
            if token.expires_at > grace {
                return Ok(token.access_token.clone());
            }
        }

        let lock = self
            .refresh_locks
            .entry(subject.to_owned())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone();
        let _guard = lock.lock().await;

        if let Some(token) = self.token_cache.get(subject).await {
            let grace = Utc::now() + chrono::Duration::seconds(TOKEN_GRACE_PERIOD_SECS);
            if token.expires_at > grace {
                return Ok(token.access_token.clone());
            }
        }

        let subject_id = SubjectIdentifier::new(subject.to_string());
        let stored = auth_core::database::read_token_from_database(
            &self.database_connection,
            &subject_id,
            None,
            &self.public_key,
            &self.secret_key,
        )
        .await?;

        let refresh_token = RefreshToken::new(stored.refresh_token_secret.clone());
        let token_response =
            exchange_refresh_token(&self.oidc_client, &self.http_client, &refresh_token).await?;

        let access_token = token_response.access_token().secret().to_string();
        let expires_in = token_response
            .expires_in()
            .unwrap_or_else(|| Duration::from_secs(DEFAULT_TOKEN_EXPIRY_SECS));
        let expires_at = Utc::now()
            + chrono::Duration::from_std(expires_in)
                .map_err(|err| anyhow::anyhow!("token expiry duration out of range: {err}"))?;

        let new_refresh_secret = token_response
            .refresh_token()
            .map(|rt| rt.secret().to_string())
            .unwrap_or(stored.refresh_token_secret);

        let issuer = IssuerUrl::new(stored.issuer.clone())?;

        if token_response.refresh_token().is_some() {
            let new_token_info = CachedToken {
                access_token: String::new(),
                expires_at: Utc::now(),
                refresh_token: new_refresh_secret.clone(),
                issuer: issuer.clone(),
                subject: subject.to_string(),
            };
            auth_core::database::write_token_to_database(
                &self.database_connection,
                &new_token_info,
                &self.public_key,
            )
            .await?;
        }

        let cached = CachedToken {
            access_token: access_token.clone(),
            expires_at,
            refresh_token: new_refresh_secret,
            issuer,
            subject: subject.to_string(),
        };

        self.token_cache.insert(subject.to_string(), cached).await;

        Ok(access_token)
    }

    pub async fn get_cached_subject(&self, pod_key: &str) -> Option<String> {
        self.subject_cache.get(pod_key).await
    }

    pub async fn set_cached_subject(&self, pod_key: String, subject: String) {
        self.subject_cache.insert(pod_key, subject).await;
    }

    pub async fn check_database(&self) -> auth_core::Result<()> {
        self.database_connection.ping().await?;
        Ok(())
    }
}
