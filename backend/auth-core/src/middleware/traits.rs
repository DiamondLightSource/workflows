use async_trait::async_trait;
use axum::http::StatusCode;

use crate::Result;

// How tokens ore loaded, saved and refreshed
#[async_trait]
pub trait TokenStore: Send + Sync {
    type Token: TokenInspector + Send + Sync + Clone;

    async fn load_token(&self) -> Option<Self::Token>;
    async fn save_token(&self, token: &Self::Token) -> Result<()>;
    async fn refresh_and_persist(&self, token: &Self::Token) -> Result<Self::Token>;
}

//How to inspect a token's state
pub trait TokenInspector {
    fn is_expired(&self) -> bool;
    fn bearer_value(&self) -> Option<String>;
}

// Whether to retry after a response
pub trait RetryPolicy: Send + Sync {
    fn should_retry(&self, status: StatusCode, body: &[u8]) -> bool;
}
