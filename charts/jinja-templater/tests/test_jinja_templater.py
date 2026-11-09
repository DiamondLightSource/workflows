"""Tests for the generic jinja-templater metacontroller hook.

The tests exercise the pure ``sync()``/``customize()`` functions directly with
hand-built metacontroller request payloads. A second group loads the real rule
templates shipped by the consuming charts, so a change to those templates is
caught here as well.
"""

import base64
import importlib.util
from pathlib import Path

import yaml

HOOK_PATH = Path(__file__).resolve().parents[1] / "hooks" / "jinja_templater.py"
CHARTS = Path(__file__).resolve().parents[2]

spec = importlib.util.spec_from_file_location("jinja_templater", HOOK_PATH)
jinja_templater = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(jinja_templater)


# --- helpers ---------------------------------------------------------------


def b64(value: str) -> str:
    return base64.b64encode(value.encode()).decode()


def secret(namespace: str, name: str, data: dict[str, str]) -> dict:
    return {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {"namespace": namespace, "name": name},
        "data": {key: b64(value) for key, value in data.items()},
    }


def configmap(namespace: str, name: str, data: dict[str, str]) -> dict:
    return {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": {"namespace": namespace, "name": name},
        "data": data,
    }


def add_related(related: dict, obj: dict) -> None:
    key = jinja_templater.gvk_key(obj["kind"], obj["apiVersion"])
    related.setdefault(key, {})[f"{obj['metadata']['namespace']}/{obj['metadata']['name']}"] = obj


def related_map(*objects: dict) -> dict:
    related: dict = {}
    for obj in objects:
        add_related(related, obj)
    return related


def source(
    name: str,
    *,
    api_version: str = "v1",
    kind: str = "Secret",
    resource: str = "secrets",
    namespace: str | None = None,
    alias: str | None = None,
) -> dict:
    result = {
        "name": name,
        "apiVersion": api_version,
        "kind": kind,
        "resource": resource,
    }
    if namespace is not None:
        result["namespace"] = namespace
    if alias is not None:
        result["alias"] = alias
    return result


def make_parent(namespace: str, sources: list[dict], templates: dict[str, str]) -> dict:
    return {
        "apiVersion": "templating.diamond.ac.uk/v1alpha1",
        "kind": "JinjaTemplate",
        "metadata": {"name": "test", "namespace": namespace, "generation": 1},
        "spec": {"sources": sources, "templates": templates},
    }


def children_by_name(children: list[dict]) -> dict[str, dict]:
    return {child["metadata"]["name"]: child for child in children}


def condition(response: dict) -> dict:
    return response["status"]["conditions"][0]


def load_rule(relative_path: str) -> str:
    return (CHARTS / relative_path).read_text()


# --- engine: rendering -----------------------------------------------------


def test_gvk_key_for_core_and_grouped_apis():
    assert jinja_templater.gvk_key("Secret", "v1") == "Secret.v1"
    assert jinja_templater.gvk_key("Deployment", "apps/v1") == "Deployment.apps/v1"


def test_renders_secret_from_configmap_and_secrets():
    parent = make_parent(
        "workflows",
        [
            source("settings", kind="ConfigMap", resource="configmaps", alias="settings"),
            source("credentials", alias="credentials"),
        ],
        {
            "composite": (
                "apiVersion: v1\n"
                "kind: Secret\n"
                "metadata:\n"
                "  name: composite\n"
                "type: Opaque\n"
                "stringData:\n"
                "  config.yaml: |\n"
                "    {{ settings.data['config.yaml'] | fromyaml"
                " | combine({'token': credentials.data['token']})"
                " | to_nice_yaml | indent(4) }}\n"
            )
        },
    )
    related = related_map(
        configmap(
            "workflows",
            "settings",
            {"config.yaml": yaml.safe_dump({"oidc": "https://issuer"})},
        ),
        secret("workflows", "credentials", {"token": "s3cr3t"}),
    )

    response = jinja_templater.sync(parent, related, {})

    child = response["children"][0]
    assert child["kind"] == "Secret"
    assert child["metadata"]["name"] == "composite"
    assert child["metadata"]["namespace"] == "workflows"
    config = yaml.safe_load(child["stringData"]["config.yaml"])
    assert config == {"oidc": "https://issuer", "token": "s3cr3t"}
    assert condition(response)["status"] == "True"
    assert condition(response)["reason"] == "TemplatesRendered"


def test_renders_configmap():
    parent = make_parent(
        "workflows",
        [source("input", kind="ConfigMap", resource="configmaps", alias="input")],
        {
            "config": (
                "apiVersion: v1\n"
                "kind: ConfigMap\n"
                "metadata:\n"
                "  name: output\n"
                "data:\n"
                "  value: {{ input.data['value'] | upper }}\n"
            )
        },
    )
    related = related_map(configmap("workflows", "input", {"value": "hello"}))

    response = jinja_templater.sync(parent, related, {})

    child = response["children"][0]
    assert child["kind"] == "ConfigMap"
    assert child["metadata"]["namespace"] == "workflows"
    assert child["data"]["value"] == "HELLO"


def test_missing_source_skips_template():
    parent = make_parent(
        "workflows",
        [],
        {
            "config": (
                "apiVersion: v1\n"
                "kind: Secret\n"
                "metadata:\n"
                "  name: output\n"
                "stringData:\n"
                "  value: {{ missing.data['value'] }}\n"
            )
        },
    )

    response = jinja_templater.sync(parent, {}, {})

    assert response["children"] == []
    assert response["status"]["templates"]["config"]["state"] == "skipped"
    assert condition(response)["status"] == "False"
    assert condition(response)["reason"] == "TemplatesSkipped"


def test_whitespace_only_template_is_skipped():
    parent = make_parent("workflows", [], {"config": "   \n"})

    response = jinja_templater.sync(parent, {}, {})

    assert response["children"] == []
    assert response["status"]["templates"]["config"]["state"] == "skipped"


def test_skipped_template_preserves_previous_children():
    parent = make_parent("workflows", [], {"config": "{{ missing.data['value'] }}"})
    parent["status"] = {"templates": {"config": {"state": "rendered", "children": ["output"]}}}
    existing = secret("workflows", "output", {"value": "kept"})

    response = jinja_templater.sync(parent, {}, related_map(existing))

    assert response["children"] == [existing]
    state = response["status"]["templates"]["config"]
    assert state["state"] == "skipped"
    assert state["children"] == ["output"]


def test_errored_template_preserves_previous_children():
    parent = make_parent(
        "workflows",
        [],
        {
            "config": (
                "apiVersion: v1\n"
                "kind: ConfigMap\n"
                "metadata:\n"
                "  name: output\n"
                "  namespace: elsewhere\n"
            )
        },
    )
    parent["status"] = {"templates": {"config": {"state": "rendered", "children": ["output"]}}}
    existing = configmap("workflows", "output", {"value": "kept"})

    response = jinja_templater.sync(parent, {}, related_map(existing))

    assert response["children"] == [existing]
    assert response["status"]["templates"]["config"]["state"] == "error"
    assert response["status"]["templates"]["config"]["children"] == ["output"]


def test_preserved_child_is_replaced_when_source_returns():
    parent = make_parent(
        "workflows",
        [source("settings", kind="ConfigMap", resource="configmaps", alias="settings")],
        {
            "config": (
                "apiVersion: v1\n"
                "kind: Secret\n"
                "metadata:\n"
                "  name: output\n"
                "stringData:\n"
                "  value: {{ settings.data['value'] }}\n"
            )
        },
    )
    parent["status"] = {"templates": {"config": {"state": "skipped", "children": ["output"]}}}
    existing = secret("workflows", "output", {"value": "old"})

    response = jinja_templater.sync(
        parent,
        related_map(configmap("workflows", "settings", {"value": "new"})),
        related_map(existing),
    )

    assert len(response["children"]) == 1
    assert response["children"][0]["stringData"]["value"] == "new"
    assert response["status"]["templates"]["config"]["state"] == "rendered"
    assert response["status"]["templates"]["config"]["children"] == ["output"]


def test_rendered_template_does_not_keep_obsolete_children():
    parent = make_parent(
        "workflows",
        [],
        {"config": "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: second\n"},
    )
    parent["status"] = {"templates": {"config": {"state": "rendered", "children": ["first"]}}}
    existing = configmap("workflows", "first", {"value": "old"})

    response = jinja_templater.sync(parent, {}, related_map(existing))

    assert [child["metadata"]["name"] for child in response["children"]] == ["second"]


def test_renders_multiple_documents():
    parent = make_parent(
        "workflows",
        [],
        {
            "config": (
                "apiVersion: v1\n"
                "kind: ConfigMap\n"
                "metadata:\n"
                "  name: first\n"
                "---\n"
                "apiVersion: v1\n"
                "kind: ConfigMap\n"
                "metadata:\n"
                "  name: second\n"
            )
        },
    )

    response = jinja_templater.sync(parent, {}, {})

    assert set(children_by_name(response["children"])) == {"first", "second"}


def test_namespace_mismatch_is_an_error():
    parent = make_parent(
        "workflows",
        [],
        {
            "config": (
                "apiVersion: v1\n"
                "kind: ConfigMap\n"
                "metadata:\n"
                "  name: output\n"
                "  namespace: elsewhere\n"
            )
        },
    )

    response = jinja_templater.sync(parent, {}, {})

    assert response["children"] == []
    assert response["status"]["templates"]["config"]["state"] == "error"
    assert condition(response)["reason"] == "TemplateError"


def test_invalid_yaml_is_reported_without_rendered_contents():
    parent = make_parent(
        "workflows",
        [],
        {"config": "apiVersion: v1\nkind: Secret\n  bad: [\n"},
    )

    response = jinja_templater.sync(parent, {}, {})

    assert response["status"]["templates"]["config"]["state"] == "error"
    assert (
        response["status"]["templates"]["config"]["reason"] == "invalid YAML in rendered template"
    )


def test_reserved_alias_is_an_error():
    parent = make_parent(
        "workflows",
        [source("settings", kind="ConfigMap", resource="configmaps", alias="namespace")],
        {"config": "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: output\n"},
    )
    related = related_map(configmap("workflows", "settings", {"value": "x"}))

    response = jinja_templater.sync(parent, related, {})

    assert response["status"]["templates"]["config"]["state"] == "error"


def test_duplicate_source_alias_is_an_error():
    parent = make_parent(
        "workflows",
        [
            source("first", alias="same"),
            source("second", alias="same"),
        ],
        {"config": "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: output\n"},
    )
    related = related_map(
        secret("workflows", "first", {"value": "1"}),
        secret("workflows", "second", {"value": "2"}),
    )

    response = jinja_templater.sync(parent, related, {})

    assert response["status"]["templates"]["config"]["state"] == "error"


def test_no_templates_is_ready():
    parent = make_parent("workflows", [], {})

    response = jinja_templater.sync(parent, {}, {})

    assert condition(response)["status"] == "True"
    assert condition(response)["reason"] == "NoTemplates"


def test_grouped_api_version_is_looked_up():
    deployment = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {"namespace": "workflows", "name": "source"},
        "spec": {"replicas": 3},
    }
    parent = make_parent(
        "workflows",
        [
            source(
                "source",
                api_version="apps/v1",
                kind="Deployment",
                resource="deployments",
                alias="deployment",
            )
        ],
        {
            "config": (
                "apiVersion: v1\n"
                "kind: ConfigMap\n"
                "metadata:\n"
                "  name: output\n"
                "data:\n"
                "  replicas: \"{{ deployment.raw['spec']['replicas'] }}\"\n"
            )
        },
    )
    related = related_map(deployment)

    response = jinja_templater.sync(parent, related, {})

    assert response["children"][0]["data"]["replicas"] == "3"


# --- engine: customize -----------------------------------------------------


def test_customize_groups_sources_by_type_and_namespace():
    parent = make_parent(
        "auth-broker",
        [
            source("auth-broker-compose-config", kind="ConfigMap", resource="configmaps"),
            source("workflows-cluster-client", namespace="workflows"),
            source("postgres-auth-service-password", namespace="workflows"),
            source("local-secret"),
        ],
        {},
    )

    rules = jinja_templater.customize(parent)

    assert rules == [
        {
            "apiVersion": "v1",
            "resource": "configmaps",
            "namespace": "auth-broker",
            "names": ["auth-broker-compose-config"],
        },
        {
            "apiVersion": "v1",
            "resource": "secrets",
            "namespace": "auth-broker",
            "names": ["local-secret"],
        },
        {
            "apiVersion": "v1",
            "resource": "secrets",
            "namespace": "workflows",
            "names": ["postgres-auth-service-password", "workflows-cluster-client"],
        },
    ]


def test_customize_ignores_incomplete_sources():
    parent = make_parent("workflows", [{"name": "broken"}], {})

    assert jinja_templater.customize(parent) == []


# --- real rule templates ---------------------------------------------------


def global_sources() -> list[dict]:
    return [
        source("workflows-cluster-client", namespace="workflows", alias="client"),
        source(
            "postgres-auth-service-password",
            namespace="workflows",
            alias="postgres",
        ),
        source("auth-keys", namespace="workflows", alias="keys"),
    ]


def global_objects() -> tuple[dict, ...]:
    return (
        secret(
            "workflows",
            "workflows-cluster-client",
            {"client-id": "my-client", "client-secret": "my-secret"},
        ),
        secret(
            "workflows",
            "postgres-auth-service-password",
            {"username": "auth_user", "password": "secret2"},
        ),
        secret(
            "workflows",
            "auth-keys",
            {
                "encryption_public_key": "pub-key",
                "encryption_private_key": "priv-key",
            },
        ),
    )


def test_auth_broker_rule_template():
    static = configmap(
        "auth-broker",
        "auth-broker-compose-config",
        {
            "config.yaml": yaml.safe_dump(
                {
                    "oidc_provider_url": "https://identity.diamond.ac.uk/realms/dls",
                    "port": 8080,
                }
            )
        },
    )
    parent = make_parent(
        "auth-broker",
        [
            source(
                "auth-broker-compose-config",
                kind="ConfigMap",
                resource="configmaps",
                alias="static",
            ),
            *global_sources(),
        ],
        {"auth-broker-config": load_rule("auth-broker/jinja-templates/auth-broker-config.yaml.j2")},
    )
    related = related_map(static, *global_objects())

    response = jinja_templater.sync(parent, related, {})

    child = children_by_name(response["children"])["auth-broker-config"]
    assert child["metadata"]["namespace"] == "auth-broker"
    config = yaml.safe_load(child["stringData"]["config.yaml"])
    assert config["oidc_provider_url"] == "https://identity.diamond.ac.uk/realms/dls"
    assert config["port"] == 8080
    assert config["client_id"] == "my-client"
    assert config["client_secret"] == "my-secret"
    assert config["postgres_user"] == "auth_user"
    assert config["postgres_password"] == "secret2"
    assert config["encryption_public_key"] == "pub-key"
    assert config["encryption_private_key"] == "priv-key"


def test_auth_broker_rule_skipped_when_static_config_empty():
    static = configmap(
        "auth-broker",
        "auth-broker-compose-config",
        {"config.yaml": ""},
    )
    parent = make_parent(
        "auth-broker",
        [
            source(
                "auth-broker-compose-config",
                kind="ConfigMap",
                resource="configmaps",
                alias="static",
            ),
            *global_sources(),
        ],
        {"auth-broker-config": load_rule("auth-broker/jinja-templates/auth-broker-config.yaml.j2")},
    )
    related = related_map(static, *global_objects())

    response = jinja_templater.sync(parent, related, {})

    assert response["children"] == []
    assert response["status"]["templates"]["auth-broker-config"]["state"] == "skipped"


def test_auth_gateway_rule_template():
    static = configmap(
        "workflows",
        "auth-gateway-compose-config",
        {
            "config.yaml": yaml.safe_dump(
                {
                    "oidc_provider_url": "https://identity.diamond.ac.uk/realms/dls",
                    "callback_url": "https://workflows.diamond.ac.uk/auth/callback",
                    "cors_allow": ["^https://([a-z]+\\.)*diamond\\.ac\\.uk/?$"],
                }
            )
        },
    )
    parent = make_parent(
        "workflows",
        [
            source(
                "auth-gateway-compose-config",
                kind="ConfigMap",
                resource="configmaps",
                alias="static",
            ),
            *global_sources(),
        ],
        {"auth-gateway-config": load_rule("dashboard/jinja-templates/auth-gateway-config.yaml.j2")},
    )
    related = related_map(static, *global_objects())

    response = jinja_templater.sync(parent, related, {})

    child = children_by_name(response["children"])["auth-gateway-config"]
    assert child["metadata"]["namespace"] == "workflows"
    config = yaml.safe_load(child["stringData"]["config.yaml"])
    assert config["callback_url"] == "https://workflows.diamond.ac.uk/auth/callback"
    assert config["client_id"] == "my-client"
    assert config["encryption_public_key"] == "pub-key"


def test_postgres_rule_templates():
    parent = make_parent(
        "workflows",
        [
            source("postgres-argo-workflows-password", alias="argo"),
            source("postgres-auth-service-password", alias="auth"),
        ],
        {
            "postgres-application-passwords": load_rule(
                "workflows/jinja-templates/postgres-application-passwords.yaml.j2"
            ),
            "postgres-initdb-script": load_rule(
                "workflows/jinja-templates/postgres-initdb-script.yaml.j2"
            ),
        },
    )
    related = related_map(
        secret(
            "workflows",
            "postgres-argo-workflows-password",
            {"username": "argo_user", "password": "secret1"},
        ),
        secret(
            "workflows",
            "postgres-auth-service-password",
            {"username": "auth_user", "password": "secret2"},
        ),
    )

    response = jinja_templater.sync(parent, related, {})
    children = children_by_name(response["children"])

    passwords = children["postgres-application-passwords"]
    assert passwords["metadata"]["namespace"] == "workflows"
    assert base64.b64decode(passwords["data"]["usernames"]).decode() == ("argo_user,auth_user")
    assert base64.b64decode(passwords["data"]["passwords"]).decode() == "secret1,secret2"

    initdb = children["postgres-initdb-script"]
    init_sql = initdb["stringData"]["init.sql"]
    assert "CREATE USER argo_workflows WITH PASSWORD 'secret1';" in init_sql
    assert "CREATE USER auth_user WITH PASSWORD 'secret2';" in init_sql
