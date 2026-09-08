//! Bounded ISPyB and LDAP connectivity probes for the dependency endpoint.

use super::AppState;
use axum::{Json, extract::State, http::StatusCode};
use ldap3::{LdapConnAsync, Scope};
use serde::Serialize;
use sqlx::MySqlPool;
use std::time::Duration;

/// Per-dependency probe outcomes returned without underlying error details.
#[derive(Serialize)]
pub(super) struct Connectivity {
    ispyb: &'static str,
    ldap: &'static str,
}
/// Runs both probes concurrently, returning HTTP 503 if either fails or times out.
pub(super) async fn dependencies(
    State(state): State<AppState>,
) -> (StatusCode, Json<Connectivity>) {
    let (ispyb, ldap) = tokio::join!(check_ispyb(&state.database), check_ldap(&state.ldap_url));
    let status = if ispyb == "ok" && ldap == "ok" {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (status, Json(Connectivity { ispyb, ldap }))
}
/// Checks database query connectivity with a ten-second timeout.
async fn check_ispyb(pool: &MySqlPool) -> &'static str {
    match tokio::time::timeout(
        Duration::from_secs(10),
        sqlx::query("SELECT 1").execute(pool),
    )
    .await
    {
        Ok(Ok(_)) => "ok",
        Ok(Err(_)) => "connection_or_query_failed",
        Err(_) => "timeout",
    }
}
/// Checks LDAP group-base search connectivity with a ten-second timeout.
async fn check_ldap(url: &str) -> &'static str {
    match tokio::time::timeout(Duration::from_secs(10), async {
        let (conn, mut ldap) = LdapConnAsync::new(url).await?;
        ldap3::drive!(conn);
        let result = ldap
            .search(
                "ou=Group,dc=diamond,dc=ac,dc=uk",
                Scope::Base,
                "(objectClass=*)",
                vec!["1.1"],
            )
            .await?
            .success();
        let _ = ldap.unbind().await;
        result.map(|_| ())
    })
    .await
    {
        Ok(Ok(())) => "ok",
        Ok(Err(_)) => "connection_or_search_failed",
        Err(_) => "timeout",
    }
}
