
use std::time::Duration;

use anyhow::Context;
use axum_extra::headers::Authorization;
use testcontainers::core::wait::HttpWaitStrategy;
use testcontainers::core::WaitFor;
use testcontainers::runners::AsyncRunner;
use testcontainers::{ContainerAsync, GenericImage, ImageExt};

pub struct TestOidcServer {
    container: ContainerAsync<GenericImage>,
    pub host: String,
    pub port: u16,
    pub issuer_url: String,
    pub client_id: String,
    pub client_secret: String,
}

impl TestOidcServer {
    pub async fn new() -> anyhow::Result<Self> {
        let wait_strategy = HttpWaitStrategy::new("default/.well-known/openid-configuration")
            .with_expected_status_code(200u16);
        let oidc_container = GenericImage::new("ghcr.io/navikt/mock-oauth2-server", "3.0.1")
            .with_wait_for(WaitFor::http(wait_strategy))
            .with_env_var("SERVER_PORT", "8080")
            .with_startup_timeout(Duration::from_secs(60))
            .start()
            .await
            .expect("failed to start mock OIDC server");
        let port = oidc_container.get_host_port_ipv4(8080).await?;
        let host = oidc_container.get_host().await?.to_string();
        let issuer_url = format!("http://{}:{}/default", host, port);
        let server = TestOidcServer {
            container: oidc_container,
            host,
            port,
            issuer_url,
            client_id: "test_client".to_string(),
            client_secret: "test-secret".to_string(),
        };
        Ok(server)
    }

    pub async fn access_token(
        &self,
    ) -> anyhow::Result<Authorization<axum_extra::headers::authorization::Bearer>> {
        let params = [
            ("grant_type", "client_credentials"),
            ("scope", "openid"),
            ("subject", "test-subject"),
            ("client_id", &self.client_id),
            ("client_secret", &self.client_secret),
        ];
        let mock_admin_url = format!("http://{}:{}/default/token", self.host, self.port);
        let response: serde_json::Value = reqwest::Client::new()
            .post(mock_admin_url)
            .timeout(Duration::from_secs(10))
            .form(&params)
            .send()
            .await?
            .json()
            .await?;
        let access_token = response
            .get("access_token")
            .context("no access token")?
            .as_str()
            .context("invalid access token")?;
        let access_token = Authorization::bearer(access_token)?;
        Ok(access_token)
    }

    pub async fn stop(self) -> anyhow::Result<()> {
        self.container.stop_with_timeout(Some(60)).await?;
        Ok(())
    }
}
