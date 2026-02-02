use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use crate::auth_session_data::LoginSessionData;

const COUNTER_KEY: &str = "counter";

#[derive(Default, Deserialize, Serialize)]
struct Counter(usize);

pub async fn counter_write(session: Session) -> impl IntoResponse {
    let counter: Counter = session.get(COUNTER_KEY).await.unwrap().unwrap_or_default();
    let old = counter.0;
    session.insert(COUNTER_KEY, counter.0 + 1).await.unwrap();
    let new: Counter = session.get(COUNTER_KEY).await.unwrap().unwrap_or_default();
    format!("Current count: {}\nNew count: {}", old, new.0)
}

pub async fn counter_read(session: Session) -> impl IntoResponse {
    let counter: Counter = session.get(COUNTER_KEY).await.unwrap().unwrap_or_default();
    let auth_session_data = session
        .get::<LoginSessionData>(LoginSessionData::SESSION_KEY)
        .await;
    format!(
        "Reading current count: {}, auth_session_data={:?}",
        counter.0, auth_session_data
    )
}
