"""Metacontroller sync/customize hook that composes Secrets from other Secrets.

This replaces the three kyverno generating policies:
  - generate-postgres-secrets (charts/workflows)
  - auth-broker-config-generator (charts/auth-broker)
  - auth-gateway-config-generator (charts/dashboard)

The `workflows` Namespace is the parent resource. The customize hook declares the
source Secrets and the static-config ConfigMaps as related resources, so a change
to any of them re-triggers sync. The sync hook renders the four target Secrets and
returns them as children.

The composition *logic* (which source secret field feeds which target/config key)
is hardcoded here. The static (non-secret) configuration for the two config.yaml
targets is owned by their home charts and read from ConfigMaps declared as related
resources:
  - auth-broker-compose-config (auth-broker)  -> auth-broker-config
  - auth-gateway-compose-config (workflows)   -> auth-gateway-config
This keeps the environment-specific config (e.g. staging uses a test OIDC realm)
in each chart's own values.yaml/staging-values.yaml.

Targets:
  - postgres-application-passwords (workflows)  from postgres-{argo,auth}-service-password
  - postgres-initdb-script        (workflows)  from postgres-{argo,auth}-service-password
  - auth-broker-config (auth-broker) from workflows-cluster-client,
    postgres-auth-service-password, auth-keys
  - auth-gateway-config (workflows)  from workflows-cluster-client,
    postgres-auth-service-password, auth-keys
"""

import base64
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

import yaml

WORKFLOWS_NS = "workflows"

# Source secrets (namespace, name)
ARGO_POSTGRES_SRC = (WORKFLOWS_NS, "postgres-argo-workflows-password")
AUTH_POSTGRES_SRC = (WORKFLOWS_NS, "postgres-auth-service-password")

# Static-config ConfigMaps (namespace, name), rendered by the home charts.
AUTH_BROKER_CONFIG_CM = ("auth-broker", "auth-broker-compose-config")
AUTH_GATEWAY_CONFIG_CM = (WORKFLOWS_NS, "auth-gateway-compose-config")

# For each config.yaml composition: {target_key: (namespace, name, secret_key)}
AUTH_BROKER_SECRET_KEYS = {
    "client_id": (WORKFLOWS_NS, "workflows-cluster-client", "client-id"),
    "client_secret": (WORKFLOWS_NS, "workflows-cluster-client", "client-secret"),
    "postgres_user": (WORKFLOWS_NS, "postgres-auth-service-password", "username"),
    "postgres_password": (WORKFLOWS_NS, "postgres-auth-service-password", "password"),
    "encryption_public_key": (WORKFLOWS_NS, "auth-keys", "encryption_public_key"),
    "encryption_private_key": (WORKFLOWS_NS, "auth-keys", "encryption_private_key"),
}

AUTH_GATEWAY_SECRET_KEYS = {
    "client_id": (WORKFLOWS_NS, "workflows-cluster-client", "client-id"),
    "client_secret": (WORKFLOWS_NS, "workflows-cluster-client", "client-secret"),
    "postgres_user": (WORKFLOWS_NS, "postgres-auth-service-password", "username"),
    "postgres_password": (WORKFLOWS_NS, "postgres-auth-service-password", "password"),
    "encryption_public_key": (WORKFLOWS_NS, "auth-keys", "encryption_public_key"),
}


def b64_decode(value: str | None) -> str | None:
    """Decode a base64 string, returning None for missing/empty values."""
    if not value:
        return None
    try:
        return base64.b64decode(value).decode("utf-8")
    except Exception:
        return None


def b64_encode(value: str) -> str:
    """Encode a string as base64."""
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def get_secret(secrets: dict[str, dict], namespace: str, name: str) -> dict | None:
    """Look up a source secret from the related resources map."""
    return secrets.get(f"{namespace}/{name}")


def secret_field(secrets: dict[str, dict], namespace: str, name: str, key: str) -> str | None:
    """Decode a single field from a source secret, or None if the secret/field is absent."""
    secret = get_secret(secrets, namespace, name)
    if not isinstance(secret, dict):
        return None
    data = secret.get("data", {}) if isinstance(secret.get("data"), dict) else {}
    return b64_decode(data.get(key))


def config_from_related(related: dict, namespace: str, name: str) -> dict:
    """Parse the static config for a composition from its ConfigMap related resource."""
    cmaps = related.get("ConfigMap.v1", {}) if isinstance(related, dict) else {}
    cmap = cmaps.get(f"{namespace}/{name}")
    if not isinstance(cmap, dict):
        return {}
    data = cmap.get("data", {}) if isinstance(cmap.get("data"), dict) else {}
    content = data.get("config.yaml")
    if not content:
        return {}
    parsed = yaml.safe_load(content)
    return parsed if isinstance(parsed, dict) else {}


def render_config_yaml(static: dict, secret_keys: dict, secrets: dict[str, dict]) -> str | None:
    """Render the config.yaml content for one composition, or None if a source is missing."""
    if not static:
        return None
    config = dict(static)
    for target_key, (namespace, name, secret_key) in secret_keys.items():
        value = secret_field(secrets, namespace, name, secret_key)
        if value is None:
            return None
        config[target_key] = value
    return yaml.safe_dump(config, sort_keys=False)


def _secret(
    name: str,
    namespace: str,
    data: dict[str, str] | None = None,
    string_data: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Build a target Secret manifest."""
    manifest: dict[str, Any] = {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {"name": name, "namespace": namespace},
        "type": "Opaque",
    }
    if data:
        manifest["data"] = data
    if string_data:
        manifest["stringData"] = string_data
    return manifest


def render_postgres_application_passwords(secrets: dict[str, dict]) -> dict[str, Any] | None:
    """Combine the two postgres username/password secrets into one."""
    argo_user = secret_field(secrets, *ARGO_POSTGRES_SRC, "username")
    argo_pass = secret_field(secrets, *ARGO_POSTGRES_SRC, "password")
    auth_user = secret_field(secrets, *AUTH_POSTGRES_SRC, "username")
    auth_pass = secret_field(secrets, *AUTH_POSTGRES_SRC, "password")
    if None in (argo_user, argo_pass, auth_user, auth_pass):
        return None
    return _secret(
        "postgres-application-passwords",
        WORKFLOWS_NS,
        data={
            "usernames": b64_encode(f"{argo_user},{auth_user}"),
            "passwords": b64_encode(f"{argo_pass},{auth_pass}"),
        },
    )


def render_postgres_initdb_script(secrets: dict[str, dict]) -> dict[str, Any] | None:
    """Render the postgres initdb script from the two postgres passwords."""
    argo_pass = secret_field(secrets, *ARGO_POSTGRES_SRC, "password")
    auth_pass = secret_field(secrets, *AUTH_POSTGRES_SRC, "password")
    if argo_pass is None or auth_pass is None:
        return None
    init_sql = (
        f"CREATE USER argo_workflows WITH PASSWORD '{argo_pass}'; "
        "CREATE DATABASE argo_workflows OWNER argo_workflows; "
        f"CREATE USER auth_user WITH PASSWORD '{auth_pass}'; "
        "CREATE DATABASE auth_service OWNER auth_user;"
    )
    return _secret(
        "postgres-initdb-script",
        WORKFLOWS_NS,
        data={"init.sql": b64_encode(init_sql)},
    )


def render_auth_broker_config(secrets: dict[str, dict], config: dict) -> dict[str, Any] | None:
    """Render the auth-broker config.yaml secret."""
    content = render_config_yaml(config, AUTH_BROKER_SECRET_KEYS, secrets)
    if content is None:
        return None
    return _secret(
        "auth-broker-config",
        "auth-broker",
        string_data={"config.yaml": content},
    )


def render_auth_gateway_config(secrets: dict[str, dict], config: dict) -> dict[str, Any] | None:
    """Render the auth-gateway config.yaml secret."""
    content = render_config_yaml(config, AUTH_GATEWAY_SECRET_KEYS, secrets)
    if content is None:
        return None
    return _secret(
        "auth-gateway-config",
        WORKFLOWS_NS,
        string_data={"config.yaml": content},
    )


def sync(parent: dict, related: dict, children: dict) -> dict[str, Any]:
    """Compute the desired children and status for one sync request."""
    secrets = related.get("Secret.v1", {}) if isinstance(related, dict) else {}
    auth_broker_config = config_from_related(related, *AUTH_BROKER_CONFIG_CM)
    auth_gateway_config = config_from_related(related, *AUTH_GATEWAY_CONFIG_CM)

    renderers = [
        render_postgres_application_passwords,
        render_postgres_initdb_script,
        lambda s: render_auth_broker_config(s, auth_broker_config),
        lambda s: render_auth_gateway_config(s, auth_gateway_config),
    ]

    desired_children = []
    status = {"compositions": {}}
    for render in renderers:
        target = render(secrets)
        if target is None:
            continue
        name = target["metadata"]["name"]
        desired_children.append(target)
        status["compositions"][name] = "ready"

    return {"status": status, "children": desired_children}


def customize(parent: dict) -> list[dict]:
    """Declare source secrets and config ConfigMaps so sync re-runs on change."""
    return [
        {
            "apiVersion": "v1",
            "resource": "secrets",
            "namespace": WORKFLOWS_NS,
            "names": [
                "workflows-cluster-client",
                "postgres-argo-workflows-password",
                "postgres-auth-service-password",
                "auth-keys",
            ],
        },
        {
            "apiVersion": "v1",
            "resource": "configmaps",
            "namespace": AUTH_BROKER_CONFIG_CM[0],
            "names": [AUTH_BROKER_CONFIG_CM[1]],
        },
        {
            "apiVersion": "v1",
            "resource": "configmaps",
            "namespace": AUTH_GATEWAY_CONFIG_CM[0],
            "names": [AUTH_GATEWAY_CONFIG_CM[1]],
        },
    ]


class Controller(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("content-length", 0))
        request = json.loads(self.rfile.read(length))

        if self.path == "/sync":
            desired = sync(
                request.get("parent", {}),
                request.get("related", {}),
                request.get("children", {}),
            )
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(desired).encode())
        elif self.path == "/customize":
            related = customize(request.get("parent", {}))
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"relatedResources": related}).encode())
        else:
            self.send_response(404)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "404", "endpoint": self.path}).encode("utf-8"))


if __name__ == "__main__":
    HTTPServer(("", 80), Controller).serve_forever()
