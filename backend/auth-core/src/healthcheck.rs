use axum::http::StatusCode;

pub async fn healthcheck() -> StatusCode {
    StatusCode::ACCEPTED
}
