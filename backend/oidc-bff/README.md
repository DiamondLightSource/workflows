# oidc-bff

Backend-For-Frontend (BFF) authentication gateway for the Workflows UI. Handles OIDC login via Diamond Keycloak, manages browser session cookies, stores encrypted tokens, and proxies authenticated requests to the GraphQL backend.

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
| `/healthcheck` | `GET` | Health check (returns 202) |
| `/*` | any | Authenticated proxy to the GraphQL backend |

