use axum::{
    body::Body,
    extract::Request,
    http::{self, HeaderValue},
};

use crate::Result;

pub async fn clone_request(req: Request<Body>) -> Result<(Request<Body>, Request<Body>)> {
    // TODO: an inefficient method of cloning a request, improve this
    let (parts, body) = req.into_parts();
    let bytes = http_body_util::BodyExt::collect(body).await?.to_bytes();
    let req1 = Request::from_parts(parts.clone(), Body::from(bytes.clone()));
    let req2 = Request::from_parts(parts, Body::from(bytes));
    Ok((req1, req2))
}

pub fn prepare_headers(req: &mut Request, bearer_token: &str) {
    let value = format!("Bearer {}", bearer_token);
    req.headers_mut().insert(
        http::header::AUTHORIZATION,
        HeaderValue::from_str(&value).unwrap(),
    );
    req.headers_mut().remove(http::header::COOKIE);
}
