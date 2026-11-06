"""Unit tests for the compose-secrets metacontroller hook.

The hook lives in charts/workflows/hooks/compose-secrets.py and is shipped as a
ConfigMap. These tests exercise the pure sync()/customize() functions directly
with hand-built metacontroller request payloads.
"""

import base64
import importlib.util
from pathlib import Path

import yaml

HOOK_PATH = Path(__file__).resolve().parents[1] / "hooks" / "compose-secrets.py"

spec = importlib.util.spec_from_file_location("compose_secrets", HOOK_PATH)
compose_secrets = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(compose_secrets)


def b64(s: str) -> str:
    return base64.b64encode(s.encode()).decode()


def secret(namespace: str, name: str, data: dict[str, str]) -> dict:
    return {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {"name": name, "namespace": namespace},
        "data": {k: b64(v) for k, v in data.items()},
    }


def configmap(namespace: str, name: str, data: dict) -> dict:
    return {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": {"name": name, "namespace": namespace},
        "data": {"config.yaml": yaml.safe_dump(data, sort_keys=False)},
    }


def full_secrets() -> dict[str, dict]:
    return {
        "workflows/workflows-cluster-client": secret(
            "workflows",
            "workflows-cluster-client",
            {"client-id": "my-client", "client-secret": "my-secret"},
        ),
        "workflows/postgres-argo-workflows-password": secret(
            "workflows",
            "postgres-argo-workflows-password",
            {"username": "argo_user", "password": "secret1"},
        ),
        "workflows/postgres-auth-service-password": secret(
            "workflows",
            "postgres-auth-service-password",
            {"username": "auth_user", "password": "secret2"},
        ),
        "workflows/auth-keys": secret(
            "workflows",
            "auth-keys",
            {
                "encryption_public_key": "pub-key",
                "encryption_private_key": "priv-key",
            },
        ),
    }


def sample_config() -> dict:
    return {
        "authBrokerConfig": {
            "oidc_provider_url": "https://identity.diamond.ac.uk/realms/dls",
            "port": 8080,
            "graph_url": "https://graph.diamond.ac.uk/",
            "postgres_database": "auth_service",
        },
        "authGatewayConfig": {
            "oidc_provider_url": "https://identity.diamond.ac.uk/realms/dls",
            "port": 80,
            "callback_url": "https://workflows.diamond.ac.uk/auth/callback",
        },
    }


def related(secrets: dict[str, dict], config: dict | None = None) -> dict:
    """Build a related-resources map with secrets and static-config ConfigMaps."""
    if config is None:
        config = sample_config()
    result: dict = {"Secret.v1": secrets, "ConfigMap.v1": {}}
    if config.get("authBrokerConfig"):
        result["ConfigMap.v1"]["auth-broker/auth-broker-compose-config"] = configmap(
            "auth-broker", "auth-broker-compose-config", config["authBrokerConfig"]
        )
    if config.get("authGatewayConfig"):
        result["ConfigMap.v1"]["workflows/auth-gateway-compose-config"] = configmap(
            "workflows", "auth-gateway-compose-config", config["authGatewayConfig"]
        )
    return result


def children_by_name(children: list[dict]) -> dict[str, dict]:
    return {c["metadata"]["name"]: c for c in children}


# --- postgres-application-passwords ---


def test_renders_postgres_application_passwords():
    response = compose_secrets.sync({}, related(full_secrets()), {})
    children = children_by_name(response["children"])

    target = children["postgres-application-passwords"]
    assert target["metadata"]["namespace"] == "workflows"
    assert target["metadata"]["name"] == "postgres-application-passwords"
    assert target["data"]["usernames"] == b64("argo_user,auth_user")
    assert target["data"]["passwords"] == b64("secret1,secret2")
    assert response["status"]["compositions"]["postgres-application-passwords"] == "ready"


def test_postgres_application_passwords_skipped_when_source_missing():
    secrets = {
        "workflows/postgres-argo-workflows-password": secret(
            "workflows",
            "postgres-argo-workflows-password",
            {"username": "argo_user", "password": "secret1"},
        )
    }
    response = compose_secrets.sync({}, related(secrets), {})
    children = children_by_name(response["children"])

    assert "postgres-application-passwords" not in children
    assert "postgres-application-passwords" not in response["status"]["compositions"]


# --- postgres-initdb-script ---


def test_renders_postgres_initdb_script():
    response = compose_secrets.sync({}, related(full_secrets()), {})
    children = children_by_name(response["children"])

    target = children["postgres-initdb-script"]
    assert target["metadata"]["namespace"] == "workflows"
    expected = (
        "CREATE USER argo_workflows WITH PASSWORD 'secret1'; "
        "CREATE DATABASE argo_workflows OWNER argo_workflows; "
        "CREATE USER auth_user WITH PASSWORD 'secret2'; "
        "CREATE DATABASE auth_service OWNER auth_user;"
    )
    assert target["data"]["init.sql"] == b64(expected)


def test_postgres_initdb_script_skipped_when_source_missing():
    secrets = {
        "workflows/postgres-argo-workflows-password": secret(
            "workflows",
            "postgres-argo-workflows-password",
            {"username": "argo_user", "password": "secret1"},
        )
    }
    response = compose_secrets.sync({}, related(secrets), {})
    children = children_by_name(response["children"])

    assert "postgres-initdb-script" not in children


# --- auth-broker-config ---


def test_renders_auth_broker_config():
    response = compose_secrets.sync({}, related(full_secrets()), {})
    children = children_by_name(response["children"])

    target = children["auth-broker-config"]
    assert target["metadata"]["name"] == "auth-broker-config"
    assert target["metadata"]["namespace"] == "auth-broker"

    content = yaml.safe_load(target["stringData"]["config.yaml"])
    assert content["oidc_provider_url"] == "https://identity.diamond.ac.uk/realms/dls"
    assert content["client_id"] == "my-client"
    assert content["client_secret"] == "my-secret"
    assert content["postgres_user"] == "auth_user"
    assert content["postgres_password"] == "secret2"
    assert content["encryption_public_key"] == "pub-key"
    assert content["encryption_private_key"] == "priv-key"


def test_auth_broker_config_skipped_when_client_secret_missing():
    secrets = full_secrets()
    del secrets["workflows/workflows-cluster-client"]
    response = compose_secrets.sync({}, related(secrets), {})
    children = children_by_name(response["children"])

    assert "auth-broker-config" not in children


def test_auth_broker_config_skipped_when_config_missing():
    config = sample_config()
    del config["authBrokerConfig"]
    response = compose_secrets.sync({}, related(full_secrets(), config), {})
    children = children_by_name(response["children"])

    assert "auth-broker-config" not in children


def test_auth_broker_config_uses_environment_static_config():
    config = dict(sample_config())
    config["authBrokerConfig"] = {
        "oidc_provider_url": "https://identity-test.diamond.ac.uk/realms/dls",
        "graph_url": "http://graph-proxy.graph-proxy.svc.cluster.local/",
    }
    response = compose_secrets.sync({}, related(full_secrets(), config), {})
    children = children_by_name(response["children"])

    content = yaml.safe_load(children["auth-broker-config"]["stringData"]["config.yaml"])
    assert content["oidc_provider_url"] == "https://identity-test.diamond.ac.uk/realms/dls"
    assert content["graph_url"] == "http://graph-proxy.graph-proxy.svc.cluster.local/"


# --- auth-gateway-config ---


def test_renders_auth_gateway_config():
    response = compose_secrets.sync({}, related(full_secrets()), {})
    children = children_by_name(response["children"])

    target = children["auth-gateway-config"]
    assert target["metadata"]["name"] == "auth-gateway-config"
    assert target["metadata"]["namespace"] == "workflows"

    content = yaml.safe_load(target["stringData"]["config.yaml"])
    assert content["client_id"] == "my-client"
    assert content["postgres_user"] == "auth_user"
    assert content["encryption_public_key"] == "pub-key"
    assert content["callback_url"] == "https://workflows.diamond.ac.uk/auth/callback"


def test_auth_gateway_config_skipped_when_auth_keys_missing():
    secrets = full_secrets()
    del secrets["workflows/auth-keys"]
    response = compose_secrets.sync({}, related(secrets), {})
    children = children_by_name(response["children"])

    assert "auth-gateway-config" not in children


# --- customize ---


def test_customize_returns_source_secrets_and_config_maps():
    rules = compose_secrets.customize({})
    assert len(rules) == 3

    secrets_rule = rules[0]
    assert secrets_rule["apiVersion"] == "v1"
    assert secrets_rule["resource"] == "secrets"
    assert secrets_rule["namespace"] == "workflows"
    assert set(secrets_rule["names"]) == {
        "workflows-cluster-client",
        "postgres-argo-workflows-password",
        "postgres-auth-service-password",
        "auth-keys",
    }

    cm_rule_auth_broker = rules[1]
    assert cm_rule_auth_broker["resource"] == "configmaps"
    assert cm_rule_auth_broker["namespace"] == "auth-broker"
    assert cm_rule_auth_broker["names"] == ["auth-broker-compose-config"]

    cm_rule_auth_gateway = rules[2]
    assert cm_rule_auth_gateway["resource"] == "configmaps"
    assert cm_rule_auth_gateway["namespace"] == "workflows"
    assert cm_rule_auth_gateway["names"] == ["auth-gateway-compose-config"]


# --- static config from related ConfigMaps ---


def test_config_from_related_parses_configmap():
    related_map = related({}, sample_config())
    cfg = compose_secrets.config_from_related(
        related_map, "auth-broker", "auth-broker-compose-config"
    )
    assert cfg["oidc_provider_url"] == "https://identity.diamond.ac.uk/realms/dls"
    assert cfg["port"] == 8080


def test_config_from_related_returns_empty_when_missing():
    assert (
        compose_secrets.config_from_related({}, "auth-broker", "auth-broker-compose-config") == {}
    )
