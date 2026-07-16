use k8s_openapi::api::authentication::v1::{TokenReview, TokenReviewSpec};
use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;
use kube::api::{ApiResource, DynamicObject, PostParams};
use kube::core::GroupVersionKind;

use auth_core::async_trait::async_trait;

#[async_trait]
pub trait K8sApi: Send + Sync {
    async fn create_token_review(&self, token: &str) -> anyhow::Result<TokenReview>;
    async fn get_pod(
        &self,
        namespace: &str,
        name: &str,
    ) -> anyhow::Result<k8s_openapi::api::core::v1::Pod>;
    async fn get_workflow(&self, namespace: &str, name: &str) -> anyhow::Result<DynamicObject>;
}

pub struct RealK8sApi {
    client: kube::Client,
    audience: String,
}

impl RealK8sApi {
    pub fn new(client: kube::Client, audience: String) -> Self {
        Self { client, audience }
    }
}

#[async_trait]
impl K8sApi for RealK8sApi {
    async fn create_token_review(&self, token: &str) -> anyhow::Result<TokenReview> {
        let api: kube::Api<TokenReview> = kube::Api::all(self.client.clone());
        let token_review = TokenReview {
            metadata: ObjectMeta::default(),
            spec: TokenReviewSpec {
                audiences: Some(vec![self.audience.clone()]),
                token: Some(token.to_owned()),
            },
            status: None,
        };
        let created = api.create(&PostParams::default(), &token_review).await?;
        Ok(created)
    }

    async fn get_pod(
        &self,
        namespace: &str,
        name: &str,
    ) -> anyhow::Result<k8s_openapi::api::core::v1::Pod> {
        let pods: kube::Api<k8s_openapi::api::core::v1::Pod> =
            kube::Api::namespaced(self.client.clone(), namespace);
        Ok(pods.get(name).await?)
    }

    async fn get_workflow(&self, namespace: &str, name: &str) -> anyhow::Result<DynamicObject> {
        let gvk = GroupVersionKind::gvk("argoproj.io", "v1alpha1", "Workflow");
        let api = kube::Api::<DynamicObject>::namespaced_with(
            self.client.clone(),
            namespace,
            &ApiResource::from_gvk_with_plural(&gvk, "workflows"),
        );
        Ok(api.get(name).await?)
    }
}
