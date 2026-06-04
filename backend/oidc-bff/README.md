# oidc-bff

Backend-For-Frontend (BFF) authentication gateway for the Workflows UI. Handles OIDC login via Diamond Keycloak, manages browser session cookies, stores encrypted tokens, and proxies authenticated requests to the GraphQL backend. It also hosts the **machine-account bootstrap** (device-authorization grant) used to provision headless workflow nodes — see below.

## Usage

```sh
WORKFLOWS_OIDC_BFF_CONFIG=config.yaml cargo run
```

Serves on port `5173` by default (configurable in `config.yaml`).

## Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/auth/login` | `GET` | Start OIDC login flow |
| `/auth/callback` | `GET` | Complete login, set session cookie |
| `/auth/logout` | `POST` | Clear session and delete stored tokens |
| `/auth/device/start` | `POST` | Start machine-account device-auth; returns `user_code` + `verification_uri` |
| `/auth/device/poll` | `POST` | Poll once with `{ "device_code": ... }`; `202` pending, `200` once the offline token is persisted |
| `/healthcheck` | `GET` | Health check (returns 202) |
| `/*` | any | Authenticated proxy to the GraphQL backend |

## Machine account bootstrap (device authorization grant)

Headless nodes have no browser and cannot use the interactive login flow. They are provisioned
once via the OAuth 2.0 Device Authorization Grant (RFC 8628), driven by the two `/auth/device/*`
endpoints above. This uses a **separate shared confidential client** (`machine_client_id` /
`machine_client_secret` in `config.yaml`) that has the device grant and `offline_access` enabled
in Keycloak — distinct from the human-login client.

On success the machine's offline refresh token is written to the `oidc_tokens` table keyed by its
subject — the same table, schema and encryption used by interactive login. From then on
`auth-daemon` refreshes it automatically. Re-run the flow only if the offline token is revoked.

> **Security:** these endpoints mint a long-lived offline credential for whatever account the
> operator logs in as, so they are more sensitive than `/auth/login`. Keep them off the public
> surface (network-restricted / operator-only).

