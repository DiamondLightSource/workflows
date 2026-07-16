use k8s_openapi::api::authentication::v1::TokenReview;

use super::authz_error::AuthzError;

pub struct PodIdentity {
    pub pod_namespace: String,
    pub pod_name: String,
    pub pod_uid: Option<String>,
}

impl PodIdentity {
    pub fn new(token_review: &TokenReview) -> Result<PodIdentity, AuthzError> {
        if !token_review
            .status
            .as_ref()
            .and_then(|s| s.authenticated)
            .unwrap_or(false)
        {
            return Err(AuthzError::TokenNotAuthenticated);
        }

        let token_username = token_review
            .status
            .as_ref()
            .and_then(|s| s.user.as_ref())
            .and_then(|u| u.username.as_deref())
            .ok_or(AuthzError::NoUsername)?;

        let (pod_namespace, _service_account_name) = token_username
            .strip_prefix("system:serviceaccount:")
            .and_then(|rest| rest.split_once(':'))
            .ok_or_else(|| AuthzError::UnexpectedUsernameFormat(token_username.to_owned()))?;

        let pod_name = token_review
            .status
            .as_ref()
            .and_then(|s| s.user.as_ref())
            .and_then(|u| u.extra.as_ref())
            .and_then(|e| e.get("authentication.kubernetes.io/pod-name"))
            .and_then(|v| v.first())
            .ok_or(AuthzError::MissingPodName)?;

        let pod_uid = token_review
            .status
            .as_ref()
            .and_then(|s| s.user.as_ref())
            .and_then(|u| u.extra.as_ref())
            .and_then(|e| e.get("authentication.kubernetes.io/pod-uid"))
            .and_then(|v| v.first())
            .cloned();

        Ok(PodIdentity {
            pod_namespace: pod_namespace.to_owned(),
            pod_name: pod_name.clone(),
            pod_uid,
        })
    }
}

#[cfg(test)]
mod tests {
    use k8s_openapi::api::authentication::v1::{TokenReview, TokenReviewStatus, UserInfo};
    use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;

    use super::*;

    fn authenticated_token_review(pod_name: &str, pod_uid: &str) -> TokenReview {
        TokenReview {
            metadata: ObjectMeta::default(),
            spec: Default::default(),
            status: Some(TokenReviewStatus {
                authenticated: Some(true),
                error: None,
                user: Some(UserInfo {
                    extra: Some(
                        [
                            (
                                "authentication.kubernetes.io/pod-name".to_string(),
                                vec![pod_name.to_string()],
                            ),
                            (
                                "authentication.kubernetes.io/pod-uid".to_string(),
                                vec![pod_uid.to_string()],
                            ),
                        ]
                        .into_iter()
                        .collect(),
                    ),
                    groups: None,
                    uid: None,
                    username: Some("system:serviceaccount:test-ns:test-sa".to_string()),
                }),
                audiences: None,
            }),
        }
    }

    #[test]
    fn extract_pod_identity_from_valid_review() {
        let review = authenticated_token_review("my-pod", "uid-123");
        let identity = PodIdentity::new(&review).unwrap();
        assert_eq!(identity.pod_namespace, "test-ns");
        assert_eq!(identity.pod_name, "my-pod");
        assert_eq!(identity.pod_uid.as_deref(), Some("uid-123"));
    }

    #[test]
    fn reject_unauthenticated_token() {
        let review = TokenReview {
            metadata: ObjectMeta::default(),
            spec: Default::default(),
            status: Some(TokenReviewStatus {
                authenticated: Some(false),
                error: Some("not authenticated".into()),
                user: None,
                audiences: None,
            }),
        };
        assert!(matches!(
            PodIdentity::new(&review),
            Err(AuthzError::TokenNotAuthenticated)
        ));
    }

    #[test]
    fn reject_missing_username() {
        let review = TokenReview {
            metadata: ObjectMeta::default(),
            spec: Default::default(),
            status: Some(TokenReviewStatus {
                authenticated: Some(true),
                error: None,
                user: Some(UserInfo {
                    extra: None,
                    groups: None,
                    uid: None,
                    username: None,
                }),
                audiences: None,
            }),
        };
        assert!(matches!(
            PodIdentity::new(&review),
            Err(AuthzError::NoUsername)
        ));
    }

    #[test]
    fn reject_bad_username_format() {
        let review = TokenReview {
            metadata: ObjectMeta::default(),
            spec: Default::default(),
            status: Some(TokenReviewStatus {
                authenticated: Some(true),
                error: None,
                user: Some(UserInfo {
                    extra: None,
                    groups: None,
                    uid: None,
                    username: Some("not-a-service-account".to_string()),
                }),
                audiences: None,
            }),
        };
        assert!(matches!(
            PodIdentity::new(&review),
            Err(AuthzError::UnexpectedUsernameFormat(_))
        ));
    }

    #[test]
    fn reject_missing_pod_name() {
        let review = TokenReview {
            metadata: ObjectMeta::default(),
            spec: Default::default(),
            status: Some(TokenReviewStatus {
                authenticated: Some(true),
                error: None,
                user: Some(UserInfo {
                    extra: Some(Default::default()),
                    groups: None,
                    uid: None,
                    username: Some("system:serviceaccount:test-ns:test-sa".to_string()),
                }),
                audiences: None,
            }),
        };
        assert!(matches!(
            PodIdentity::new(&review),
            Err(AuthzError::MissingPodName)
        ));
    }
}
