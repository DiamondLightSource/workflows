use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum_test::TestServer;
use k8s_openapi::api::authentication::v1::{TokenReview, TokenReviewStatus, UserInfo};
use k8s_openapi::api::core::v1::{Namespace, Pod, PodSpec, ServiceAccount};
use k8s_openapi::apiextensions_apiserver::pkg::apis::apiextensions::v1::CustomResourceDefinition;
use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;
use kube::api::{Api, DynamicObject, PostParams};
use kube::config::KubeConfigOptions;
use testcontainers::core::wait::HttpWaitStrategy;
use testcontainers::{GenericImage, ImageExt};
use testcontainers::{core::WaitFor, runners::AsyncRunner};

use auth_core::async_trait::async_trait;
use auth_core::base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use auth_core::config::CommonConfig;
use auth_core::sea_orm::{ActiveValue::Set, Database, DatabaseConnection, EntityTrait};

use crate::config::AuthBrokerConfig;
use crate::ext_authz::authorize_request;
use crate::k8s::K8sApi;
use crate::state::AuthBrokerState;

const TEST_PUBLIC_KEY_B64: &str = "ZpJ703xR7atXbGXI20FkQk3J1qjLxodTP6yk92yPVGM=";
const TEST_PRIVATE_KEY_B64: &str = "yxjSYB/nvdAzktd83diOtADvp3RX/0Kx5V3FgK7YlXk=";

struct MockK8sApi;

#[async_trait]
impl K8sApi for MockK8sApi {
    async fn create_token_review(&self, _token: &str) -> anyhow::Result<TokenReview> {
        Ok(TokenReview {
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
                                vec!["test-pod".to_string()],
                            ),
                            (
                                "authentication.kubernetes.io/pod-uid".to_string(),
                                vec!["test-pod-uid-1234".to_string()],
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
        })
    }

    async fn get_pod(&self, _namespace: &str, _name: &str) -> anyhow::Result<Pod> {
        Ok(Pod {
            metadata: ObjectMeta {
                name: Some("test-pod".to_string()),
                namespace: Some("test-ns".to_string()),
                uid: Some("test-pod-uid-1234".to_string()),
                labels: Some(
                    [(
                        "workflows.argoproj.io/workflow".to_string(),
                        "test-workflow".to_string(),
                    )]
                    .into_iter()
                    .collect(),
                ),
                ..ObjectMeta::default()
            },
            spec: Some(PodSpec {
                service_account_name: Some("test-sa".to_string()),
                ..PodSpec::default()
            }),
            ..Pod::default()
        })
    }

    async fn get_workflow(&self, _namespace: &str, _name: &str) -> anyhow::Result<DynamicObject> {
        let gvk = kube::core::GroupVersionKind::gvk("argoproj.io", "v1alpha1", "Workflow");
        let resource = kube::api::ApiResource::from_gvk_with_plural(&gvk, "workflows");
        let mut workflow = DynamicObject::new("test-workflow", &resource).within("test-ns");
        workflow.metadata.labels = Some(
            [(
                "workflows.argoproj.io/creator".to_string(),
                "test-subject".to_string(),
            )]
            .into_iter()
            .collect(),
        );
        Ok(workflow)
    }
}

async fn test_database(issuer_url: &str, refresh_token: &str) -> DatabaseConnection {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("connect to in-memory SQLite");
    <migration::Migrator as migration::MigratorTrait>::up(&db, None)
        .await
        .expect("run database migrations");

    let public_key = auth_core::sodiumoxide::crypto::box_::PublicKey::from_slice(
        &BASE64
            .decode(TEST_PUBLIC_KEY_B64)
            .expect("decode test public key"),
    )
    .expect("valid public key bytes");

    let encrypted =
        auth_core::sodiumoxide::crypto::sealedbox::seal(refresh_token.as_bytes(), &public_key);

    let now: chrono::DateTime<chrono::FixedOffset> = chrono::Utc::now().into();
    let expires_at = now + Duration::from_secs(600);

    auth_core::entity::oidc_tokens::Entity::insert(auth_core::entity::oidc_tokens::ActiveModel {
        issuer: Set(issuer_url.to_string()),
        subject: Set("test-subject".to_string()),
        encrypted_refresh_token: Set(encrypted),
        expires_at: Set(Some(expires_at)),
        created_at: Set(now),
        updated_at: Set(now),
    })
    .exec(&db)
    .await
    .expect("insert test token into database");

    db
}

async fn create_namespace(client: &kube::Client, name: &str) -> anyhow::Result<()> {
    let api: Api<Namespace> = Api::all(client.clone());
    let ns = serde_json::from_value(serde_json::json!({
        "apiVersion": "v1",
        "kind": "Namespace",
        "metadata": { "name": name }
    }))?;
    api.create(&PostParams::default(), &ns).await?;
    Ok(())
}

async fn create_service_account(
    client: &kube::Client,
    namespace: &str,
    name: &str,
) -> anyhow::Result<()> {
    let api: Api<ServiceAccount> = Api::namespaced(client.clone(), namespace);
    let service_account = serde_json::from_value(serde_json::json!({
        "apiVersion": "v1",
        "kind": "ServiceAccount",
        "metadata": { "name": name }
    }))?;
    api.create(&PostParams::default(), &service_account).await?;
    Ok(())
}

async fn install_argo_crd(client: &kube::Client) -> anyhow::Result<()> {
    let api: Api<CustomResourceDefinition> = Api::all(client.clone());
    let crd = serde_json::from_value(serde_json::json!({
        "apiVersion": "apiextensions.k8s.io/v1",
        "kind": "CustomResourceDefinition",
        "metadata": {
            "name": "workflows.argoproj.io"
        },
        "spec": {
            "group": "argoproj.io",
            "names": {
                "kind": "Workflow",
                "listKind": "WorkflowList",
                "plural": "workflows",
                "singular": "workflow"
            },
            "scope": "Namespaced",
            "versions": [{
                "name": "v1alpha1",
                "served": true,
                "storage": true,
                "schema": {
                    "openAPIV3Schema": {
                        "type": "object",
                        "x-kubernetes-preserve-unknown-fields": true
                    }
                }
            }]
        }
    }))?;
    api.create(&PostParams::default(), &crd).await?;
    tokio::time::sleep(Duration::from_secs(2)).await;
    Ok(())
}

async fn create_test_workflow(
    client: &kube::Client,
    namespace: &str,
    workflow_name: &str,
    creator: &str,
) -> anyhow::Result<()> {
    let gvk = kube::core::GroupVersionKind::gvk("argoproj.io", "v1alpha1", "Workflow");
    let resource = kube::api::ApiResource::from_gvk_with_plural(&gvk, "workflows");
    let api: Api<DynamicObject> = Api::namespaced_with(client.clone(), namespace, &resource);
    let mut workflow = DynamicObject::new(workflow_name, &resource).within(namespace);
    workflow.metadata.labels = Some(
        [(
            "workflows.argoproj.io/creator".to_string(),
            creator.to_string(),
        )]
        .into_iter()
        .collect(),
    );
    api.create(&PostParams::default(), &workflow).await?;
    Ok(())
}

async fn create_test_pod(
    client: &kube::Client,
    namespace: &str,
    pod_name: &str,
    workflow_name: &str,
    service_account_name: &str,
    audience: &str,
) -> anyhow::Result<()> {
    use k8s_openapi::api::core::v1::Pod;
    use kube::{Api, api::PostParams};

    let api: Api<Pod> = Api::namespaced(client.clone(), namespace);

    let pod: Pod = serde_json::from_value(serde_json::json!({
        "apiVersion": "v1",
        "kind": "Pod",
        "metadata": {
            "name": pod_name,
            "labels": {
                "workflows.argoproj.io/workflow": workflow_name
            }
        },
        "spec": {
            "serviceAccountName": service_account_name,
            "restartPolicy": "Never",
            "containers": [{
                "name": "main",
                "image": "busybox:1.36.1-musl",
                "command": ["sh", "-c", "sleep 3600"],
                "volumeMounts": [{
                    "name": "projected-token",
                    "mountPath": "/var/run/test-token",
                    "readOnly": true
                }]
            }],
            "volumes": [{
                "name": "projected-token",
                "projected": {
                    "sources": [{
                        "serviceAccountToken": {
                            "path": "token",
                            "audience": audience,
                            "expirationSeconds": 3600
                        }
                    }]
                }
            }]
        }
    }))?;

    api.create(&PostParams::default(), &pod).await?;
    Ok(())
}

fn init_test() {
    let _ = env_logger::try_init();
    let _ = auth_core::rustls::crypto::aws_lc_rs::default_provider().install_default();
    let _ = auth_core::sodiumoxide::init();
}

async fn start_mock_oidc() -> (testcontainers::ContainerAsync<GenericImage>, String, String) {
    let wait_strategy = HttpWaitStrategy::new("default/.well-known/openid-configuration")
        .with_expected_status_code(200u16);
    let container = GenericImage::new("ghcr.io/navikt/mock-oauth2-server", "3.0.1")
        .with_wait_for(WaitFor::http(wait_strategy))
        .with_env_var("SERVER_PORT", "8080")
        .start()
        .await
        .expect("failed to start mock OIDC server");
    let port = container
        .get_host_port_ipv4(8080)
        .await
        .expect("get OIDC container host port");

    let admin_token_url = format!("http://localhost:{port}/default/token");
    let params = [
        ("grant_type", "refresh_token"),
        ("scope", "openid offline_access"),
        ("refresh_token", "test-refresh-token"),
        ("client_id", "test-client"),
    ];
    let token_resp: serde_json::Value = reqwest::Client::new()
        .post(&admin_token_url)
        .timeout(Duration::from_secs(10))
        .form(&params)
        .send()
        .await
        .expect("send OIDC token request")
        .json()
        .await
        .expect("parse OIDC token response");

    let refresh_token = token_resp["refresh_token"]
        .as_str()
        .expect("no refresh_token in OIDC response")
        .to_string();
    let issuer_url = format!("http://localhost:{port}/default");

    (container, issuer_url, refresh_token)
}

fn test_config(issuer_url: &str) -> AuthBrokerConfig {
    AuthBrokerConfig {
        common: CommonConfig {
            client_id: "test-client".into(),
            client_secret: String::new(),
            oidc_provider_url: issuer_url.into(),
            port: 0,
            postgres_user: String::new(),
            postgres_password: String::new(),
            postgres_database: String::new(),
            postgres_hostname: String::new(),
            postgres_port: 0,
            encryption_public_key: TEST_PUBLIC_KEY_B64.into(),
            cors_allow: None,
        },
        encryption_private_key: TEST_PRIVATE_KEY_B64.into(),
        token_review_audience: "workflows-auth-broker".into(),
    }
}

async fn send_auth_request(server: &axum_test::TestServer, token: &str) -> axum_test::TestResponse {
    server
        .post("/")
        .add_header("K8s-Pod-Service-Account-Token", token)
        .await
}

async fn setup_k3s_cluster() -> auth_core::Result<(
    kube::Client,
    testcontainers::ContainerAsync<testcontainers_modules::k3s::K3s>,
)> {
    use testcontainers_modules::{
        k3s::{K3s, KUBE_SECURE_PORT},
        testcontainers::ImageExt,
    };
    let k3s_instance = K3s::default()
        .with_conf_mount(std::env::temp_dir())
        .with_privileged(true)
        .with_userns_mode("host")
        .start()
        .await?;

    let kube_port = k3s_instance.get_host_port_ipv4(KUBE_SECURE_PORT).await?;
    let kube_conf = k3s_instance
        .image()
        .read_kube_config()
        .expect("Cannot read kube conf");

    let mut kubeconfig: kube::config::Kubeconfig = serde_yaml::from_str(&kube_conf)?;

    let cluster = kubeconfig
        .clusters
        .first_mut()
        .and_then(|it| it.cluster.as_mut())
        .expect("no cluster found in kubeconfig");

    cluster.server = Some(format!("https://localhost:{kube_port}"));

    let config =
        kube::Config::from_custom_kubeconfig(kubeconfig, &KubeConfigOptions::default()).await?;

    let kube_client = kube::Client::try_from(config)?;

    Ok((kube_client, k3s_instance))
}

async fn wait_for_pod_running(
    client: &kube::Client,
    namespace: &str,
    pod_name: &str,
) -> anyhow::Result<()> {
    use k8s_openapi::api::core::v1::Pod;
    use kube::Api;
    use std::time::Duration;
    use tokio::time::{sleep, timeout};

    let pods: Api<Pod> = Api::namespaced(client.clone(), namespace);

    timeout(Duration::from_secs(60), async {
        loop {
            let pod = pods.get(pod_name).await?;

            let phase = pod.status.as_ref().and_then(|s| s.phase.as_deref());

            if phase == Some("Running") {
                return Ok::<_, anyhow::Error>(());
            }

            sleep(Duration::from_millis(500)).await;
        }
    })
    .await??;

    Ok(())
}

async fn read_projected_token_from_pod(
    client: &kube::Client,
    namespace: &str,
    pod_name: &str,
) -> anyhow::Result<String> {
    use k8s_openapi::api::core::v1::Pod;
    use kube::{Api, api::AttachParams};
    use tokio::io::AsyncReadExt;

    let pods: Api<Pod> = Api::namespaced(client.clone(), namespace);

    let mut attached = pods
        .exec(
            pod_name,
            vec!["cat", "/var/run/test-token/token"],
            &AttachParams::default().stdout(true).stderr(true),
        )
        .await?;

    let mut stdout = attached
        .stdout()
        .ok_or_else(|| anyhow::anyhow!("pod exec did not provide stdout"))?;

    let mut token = String::new();
    stdout.read_to_string(&mut token).await?;

    let token = token.trim().to_string();

    if token.is_empty() {
        anyhow::bail!("projected service account token was empty");
    }

    Ok(token)
}

fn assert_auth_response_contains_bearer_token_header(resp: &axum_test::TestResponse) {
    resp.assert_status_ok();
    let auth_header = resp
        .headers()
        .get("authorization")
        .expect("response should contain authorization header");
    let auth_str = auth_header
        .to_str()
        .expect("authorization header should be valid ASCII");
    assert!(
        auth_str.starts_with("Bearer "),
        "expected Bearer token, got: {auth_str}"
    );
    assert!(
        auth_str.len() > "Bearer ".len(),
        "token should not be empty"
    );
}

#[tokio::test]
async fn test_authorize_request_with_valid_token_and_mock_k8s() -> auth_core::Result<()> {
    init_test();
    let (oidc, issuer_url, refresh_token) = start_mock_oidc().await;
    let db = test_database(&issuer_url, &refresh_token).await;

    let config = test_config(&issuer_url);
    let k8s = Arc::new(MockK8sApi);
    let state = AuthBrokerState::with_k8s_and_db(config, k8s as Arc<dyn K8sApi>, db).await?;

    let router = Router::new().fallback(authorize_request).with_state(state);
    let server = TestServer::new(router)?;

    let resp = send_auth_request(&server, "some-token").await;
    assert_auth_response_contains_bearer_token_header(&resp);

    oidc.stop_with_timeout(Some(60)).await?;
    Ok(())
}

#[tokio::test]
async fn test_authorize_request_with_valid_token_and_k3s() -> auth_core::Result<()> {
    init_test();

    let (kube_client, k3s) = setup_k3s_cluster().await?;

    let namespace = "test-ns";
    let service_account = "test-sa";
    let pod_name = "test-pod";
    let workflow_name = "test-workflow";
    let audience = "workflows-auth-broker";

    // ── provision k8s resources ─────────────────────
    create_namespace(&kube_client, namespace).await?;
    create_service_account(&kube_client, namespace, service_account).await?;

    install_argo_crd(&kube_client).await?;
    create_test_workflow(&kube_client, namespace, workflow_name, "test-subject").await?;

    create_test_pod(
        &kube_client,
        namespace,
        pod_name,
        workflow_name,
        service_account,
        audience,
    )
    .await?;

    wait_for_pod_running(&kube_client, namespace, pod_name).await?;

    let service_account_token =
        read_projected_token_from_pod(&kube_client, namespace, pod_name).await?;

    let (oidc, issuer_url, refresh_token) = start_mock_oidc().await;
    let db = test_database(&issuer_url, &refresh_token).await;

    let auth_config = test_config(&issuer_url);
    let k8s: Arc<dyn K8sApi> = Arc::new(crate::k8s::RealK8sApi::new(
        kube_client,
        "workflows-auth-broker".into(),
    ));
    let state = AuthBrokerState::with_k8s_and_db(auth_config, k8s, db).await?;

    let router = Router::new().fallback(authorize_request).with_state(state);

    let server = TestServer::new(router)?;

    let resp = send_auth_request(&server, &service_account_token).await;
    assert_auth_response_contains_bearer_token_header(&resp);

    oidc.stop_with_timeout(Some(60)).await?;
    k3s.stop_with_timeout(Some(60)).await?;

    Ok(())
}
