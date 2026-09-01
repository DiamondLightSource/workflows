use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::Serialize;
use tower_sessions::Session;

use crate::Result;
use crate::auth_session_data::TokenSessionData;

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub name: Option<String>,
    pub preferred_username: Option<String>,
    pub fedid: Option<String>,
}

pub async fn userinfo(session: Session) -> Result<impl IntoResponse> {
    let token_session_data: Option<TokenSessionData> =
        session.get(TokenSessionData::SESSION_KEY).await?;

    match token_session_data {
        Some(token) => Ok((
            StatusCode::OK,
            Json(UserInfo {
                name: token.name,
                preferred_username: token.preferred_username,
                fedid: token.fedid,
            }),
        )
            .into_response()),
        None => Ok(StatusCode::UNAUTHORIZED.into_response()),
    }
}
