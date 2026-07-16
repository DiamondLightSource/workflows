# auth-broker

External authorization service for Envoy-compatible proxies in Argo Workflows pods.
Handles OAuth2 token refresh and returns bearer tokens only to pods allowed to receive them.

## Overview

auth-broker implements Envoy's [External Authorization](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter) protocol. When an Argo Workflows pod makes an outbound request, the sidecar proxy forwards the request headers to auth-broker, which:

1. **Authenticates the pod** via Kubernetes TokenReview (validates the projected service account token).
2. **Verifies pod identity** by fetching the pod from the API server and confirming its UID matches the token.
3. **Resolves the workflow creator** by reading the `workflows.argoproj.io/creator` label from the parent Workflow resource.
4. **Returns a fresh OAuth2 bearer token** for that creator, refreshing it from the OIDC provider as needed.

## Configuration

auth-broker reads its configuration from a YAML or JSON file (default: `config.yaml`),
overridable via the `--config` flag or `WORKFLOWS_AUTH_BROKER_CONFIG` environment variable.

| Field | Description |
|---|---|
| `client_id` | OIDC client ID |
| `client_secret` | OIDC client secret |
| `oidc_provider_url` | OIDC discovery endpoint |
| `port` | Listen port |
| `postgres_*` | PostgreSQL connection parameters |
| `encryption_public_key` | Base64-encoded sodium public key |
| `encryption_private_key` | Base64-encoded sodium private key |

Set `LOG_LEVEL` to control log verbosity (e.g. `debug`, `info`, `auth_broker=trace`).

## Building

```bash
cargo build --release
```

## Running

```bash
cargo run -- serve --config config.yaml
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Liveness probe (returns 200) |
| `*` | `/*` | Envoy ext_authz handler |

## Testing

```bash
cargo test
```

The test suite includes:
- **Unit tests** with a mock K8s API and an in-process OIDC server.
- **Integration test** using a real k3s cluster in Docker (`testcontainers`) to validate
  end-to-end TokenReview, pod lookup, and OIDC refresh flow.
