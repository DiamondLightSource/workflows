//! Kubernetes identity and authorization of trusted system callers.
use k8s_openapi::{
    api::authentication::v1::{TokenReview, TokenReviewSpec},
    api::authorization::v1::{ResourceAttributes, SubjectAccessReview, SubjectAccessReviewSpec},
    apimachinery::pkg::apis::meta::v1::ObjectMeta,
};
use kube::{Api, Client, api::PostParams};

/// The resource a system identity must be allowed to create to prepare visits.
const RESOURCE: &str = "sessionspaces";
const GROUP: &str = "workflows.diamond.ac.uk";
const VERB: &str = "create";

/// Reviews caller tokens and authorizes them against Kubernetes RBAC.
#[derive(Clone)]
pub(super) struct SystemAuth {
    reviews: Api<TokenReview>,
    authorizations: Api<SubjectAccessReview>,
}

impl SystemAuth {
    pub(super) fn new(client: Client) -> Self {
        Self {
            reviews: Api::all(client.clone()),
            authorizations: Api::all(client),
        }
    }

    /// Returns the username behind `token` when RBAC allows it to create a
    /// SessionSpace, or `None` if not allowed by k8s RBAC
    pub(super) async fn identify(&self, token: &str) -> Option<String> {
        let username = match self.review_identity(token).await {
            Some(username) => username,
            None => return None,
        };
        if self.allowed_to_create(username.as_str()).await {
            Some(username)
        } else {
            None
        }
    }

    /// Reviews the token and returns the authenticated username, if any.
    async fn review_identity(&self, token: &str) -> Option<String> {
        let review = TokenReview {
            metadata: ObjectMeta::default(),
            spec: TokenReviewSpec {
                audiences: None,
                token: Some(token.to_owned()),
            },
            status: None,
        };
        let reviewed = match self.reviews.create(&PostParams::default(), &review).await {
            Ok(reviewed) => reviewed,
            Err(error) => {
                tracing::warn!(error = %error, "Token review failed; deferring to session access check");
                return None;
            }
        };
        let status = reviewed.status?;
        if status.authenticated != Some(true) {
            tracing::debug!(
                authenticated = ?status.authenticated,
                "Token review reported an unauthenticated token"
            );
            return None;
        }
        let username = status.user.and_then(|user| user.username)?;
        if username.is_empty() {
            tracing::debug!("Token review carried no username");
            return None;
        }
        Some(username)
    }

    /// Asks Kubernetes RBAC whether `username` may create a SessionSpace.
    async fn allowed_to_create(&self, username: &str) -> bool {
        let review = SubjectAccessReview {
            metadata: ObjectMeta::default(),
            spec: SubjectAccessReviewSpec {
                user: Some(username.to_owned()),
                resource_attributes: Some(ResourceAttributes {
                    group: Some(GROUP.to_owned()),
                    resource: Some(RESOURCE.to_owned()),
                    verb: Some(VERB.to_owned()),
                    ..Default::default()
                }),
                ..Default::default()
            },
            status: None,
        };
        let reviewed = match self
            .authorizations
            .create(&PostParams::default(), &review)
            .await
        {
            Ok(reviewed) => reviewed,
            Err(error) => {
                tracing::warn!(error = %error, "Authorization review failed; deferring to session access check");
                return false;
            }
        };
        let allowed = reviewed
            .status
            .as_ref()
            .is_some_and(|status| status.allowed);
        tracing::debug!(
            username,
            resource = RESOURCE,
            verb = VERB,
            allowed,
            "Authorization review for system identity"
        );
        allowed
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
    use serde_json::{Value, json};
    use std::sync::{Arc, Mutex};

    const ACCOUNT: &str = "system:serviceaccount:events:sessionspaces-preparer";

    type MockState = (Arc<Mutex<Vec<Value>>>, StatusCode, Value);

    /// Serves a fixed review response at `path`, returning the URL and seen requests.
    async fn mock_api(
        path: &str,
        status: StatusCode,
        response: Value,
    ) -> (String, Arc<Mutex<Vec<Value>>>) {
        let seen = Arc::new(Mutex::new(Vec::new()));
        let app =
            Router::new()
                .route(
                    path,
                    post(
                        |State((seen, status, response)): State<MockState>,
                         Json(body): Json<Value>| async move {
                            seen.lock().unwrap().push(body);
                            (status, Json(response))
                        },
                    ),
                )
                .with_state((seen.clone(), status, response));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        (format!("http://{address}"), seen)
    }

    fn auth(url: &str) -> SystemAuth {
        let client =
            Client::try_from(kube::Config::new(url.parse().unwrap())).expect("test client");
        SystemAuth::new(client)
    }

    fn token_review(username: &str) -> Value {
        json!({
            "apiVersion": "authentication.k8s.io/v1",
            "kind": "TokenReview",
            "status": {
                "authenticated": true,
                "user": {"username": username},
            },
        })
    }

    fn sar(allowed: bool) -> Value {
        json!({
            "apiVersion": "authorization.k8s.io/v1",
            "kind": "SubjectAccessReview",
            "status": {"allowed": allowed},
        })
    }

    /// Two mock endpoints (tokenreviews + subjectaccessreviews) on the same port.
    /// State holds the recorded requests and canned reply for each endpoint.
    type DualState = (
        (Arc<Mutex<Vec<Value>>>, Value),
        (Arc<Mutex<Vec<Value>>>, Value),
    );

    async fn handle_token_review(
        State(((seen, response), _)): State<DualState>,
        Json(body): Json<Value>,
    ) -> (StatusCode, Json<Value>) {
        seen.lock().unwrap().push(body);
        (StatusCode::OK, Json(response))
    }

    async fn handle_sar(
        State((_, (seen, response))): State<DualState>,
        Json(body): Json<Value>,
    ) -> (StatusCode, Json<Value>) {
        seen.lock().unwrap().push(body);
        (StatusCode::OK, Json(response))
    }

    async fn dual_mock(
        token_review: Value,
        sar: Value,
    ) -> (String, Arc<Mutex<Vec<Value>>>, Arc<Mutex<Vec<Value>>>) {
        let token_seen = Arc::new(Mutex::new(Vec::new()));
        let sar_seen = Arc::new(Mutex::new(Vec::new()));
        let app = Router::new()
            .route(
                "/apis/authentication.k8s.io/v1/tokenreviews",
                post(handle_token_review),
            )
            .route(
                "/apis/authorization.k8s.io/v1/subjectaccessreviews",
                post(handle_sar),
            )
            .with_state(((token_seen.clone(), token_review), (sar_seen.clone(), sar)));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        (format!("http://{address}"), token_seen, sar_seen)
    }

    #[tokio::test]
    async fn accepts_an_identity_authorized_to_create_sessionspaces() {
        let (url, token_seen, sar_seen) = dual_mock(token_review(ACCOUNT), sar(true)).await;
        let identity = auth(&url).identify("token").await;
        assert_eq!(identity.as_deref(), Some(ACCOUNT));

        let token_requests = token_seen.lock().unwrap();
        assert_eq!(token_requests.len(), 1);
        assert_eq!(token_requests[0]["spec"]["token"], "token");
        assert!(token_requests[0]["spec"].get("audiences").is_none());

        let sar_requests = sar_seen.lock().unwrap();
        assert_eq!(sar_requests.len(), 1);
        assert_eq!(sar_requests[0]["spec"]["user"], ACCOUNT);
        assert_eq!(
            sar_requests[0]["spec"]["resourceAttributes"]["verb"],
            "create"
        );
        assert_eq!(
            sar_requests[0]["spec"]["resourceAttributes"]["resource"],
            "sessionspaces"
        );
        assert_eq!(
            sar_requests[0]["spec"]["resourceAttributes"]["group"],
            "workflows.diamond.ac.uk"
        );
        assert!(
            sar_requests[0].get("status").is_none(),
            "the review must not carry a claimed status"
        );
    }

    #[tokio::test]
    async fn rejects_an_identity_without_create_permission() {
        let (url, _, _) = dual_mock(token_review(ACCOUNT), sar(false)).await;
        assert_eq!(auth(&url).identify("token").await, None);
    }

    #[tokio::test]
    async fn rejects_an_unauthenticated_token() {
        let (url, _, _) = dual_mock(token_review(""), sar(true)).await;
        assert_eq!(auth(&url).identify("token").await, None);
    }

    #[tokio::test]
    async fn defers_to_policy_when_the_token_review_fails() {
        let (url, _) = mock_api(
            "/apis/authentication.k8s.io/v1/tokenreviews",
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"kind": "Status", "status": "Failure"}),
        )
        .await;
        assert_eq!(auth(&url).identify("token").await, None);
    }

    #[tokio::test]
    async fn defers_to_policy_when_the_authorization_review_fails() {
        let (url, _, _) = dual_mock(
            token_review(ACCOUNT),
            json!({"kind": "Status", "status": "Failure"}),
        )
        .await;
        assert_eq!(auth(&url).identify("token").await, None);
    }
}
