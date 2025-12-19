use crate::{database::write_token_to_database, state::{RouterState, TokenData}};
use http_body_util::BodyExt;
use openidconnect::{
    ClientId, ClientSecret, IssuerUrl, TokenResponse,
    core::{CoreClient, CoreProviderMetadata},
    reqwest,
};
use serde_json::Value;
use std::sync::Arc;
use axum::response::IntoResponse;

use axum::{
    body::Body,
    extract::{Request, State},
    http::{self, HeaderValue, StatusCode},
    middleware, response::Response,
};

use crate::Result;

pub async fn inject_token(
    State(state): State<Arc<RouterState>>,
    req: Request,
    next: middleware::Next,
) -> Result<impl axum::response::IntoResponse> {
    let token: Option<TokenData> = state.token.read().await.clone();
    if let Some(mut token) = token {
        println!("Injecting token");
        if (token.access_token_is_expired()) {
            println!("Access token is expired, refreshing");
            token = refresh_token_and_write_to_database(&state, &token).await?;
        }
        let mut req = clone_request(req).await?;
        prepare_headers(&mut req.0, &token);
        let response = next.clone().run(req.0).await;
        let response = response_as_json(response).await?;
        println!("DEBUG response json: {:?}", response);
        if !is_good_response(&response) {
            println!("Query failed, refreshing token and trying again");
            token = refresh_token_and_write_to_database(&state, &token).await?;
            prepare_headers(&mut req.1, &token);
            Ok(next.run(req.1).await)
        } else {
            Ok(axum::Json(response).into_response())
        }
    } else {
        println!("No token to inject");
        Ok(next.run(req).await)
    }
}

fn is_good_response(response: &Value) -> bool {

    if let Some(object) = response.as_object() {
        if let Some(errors) = object.get("errors") {
            return errors.as_array().map(|it| it.len() == 0).unwrap_or(false);
        } else {
            return true;
        }
    }
    false
}

async fn response_as_json(response: Response<Body>) -> Result<Value> {

    if !response.status().is_success() {
        Err(anyhow::anyhow!("HTTP error: {}", response.status()))?;
    }


    let collected = response.into_body().collect().await
    .map_err(|e| anyhow::anyhow!("collect body error: {}", e))?;
    let bytes = collected.to_bytes();

    let json: Value = serde_json::from_slice(&bytes)
        .map_err(|e| anyhow::anyhow!("JSON parse error: {}", e))?;
    Ok(json)
}

async fn set_token(state: &RouterState, new_token: TokenData) {
    let mut guard = state.token.write().await;
    *guard = Some(new_token);
}

async fn clone_request(req: Request<Body>) -> Result<(Request<Body>, Request<Body>)> {
    // TODO: an inefficient method of cloning a request, improve this
    let (parts, body) = req.into_parts();
    let bytes = http_body_util::BodyExt::collect(body).await?.to_bytes();
    let req1 = Request::from_parts(parts.clone(), Body::from(bytes.clone()));
    let req2 = Request::from_parts(parts, Body::from(bytes));
    Ok((req1, req2))
}

fn prepare_headers(req: &mut Request, token: &TokenData) {
    if let Some(access_token) = &token.access_token {
    let value = format!("Bearer {}", access_token.secret());
    println!("DEBUG injecting token:{:?}", value);
    req.headers_mut().insert(
        http::header::AUTHORIZATION,
        HeaderValue::from_str(&value).unwrap(),
    );
    req.headers_mut().remove(http::header::COOKIE);
}
}

async fn refresh_token_and_write_to_database(
    state: &RouterState,
    token: &TokenData,
) -> Result<TokenData> {
    let token = refresh_token(state, token).await?;
    write_token_to_database(&state.database_connection, &token, &state.public_key).await?;
    Ok(token)
}

async fn refresh_token(state: &RouterState, token: &TokenData) -> Result<TokenData> {
    let token_response = state
        .oidc_client
        .exchange_refresh_token(&token.refresh_token)?
        .request_async(&state.http_client)
        .await?;
    let token = token.update_tokens(&token_response);
    Ok(token)
}
