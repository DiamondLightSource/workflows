# auth-daemon

Sidecar HTTP proxy that injects valid OIDC access tokens into GraphQL requests made from within Argo workflows. Workflows call the daemon on `localhost` instead of the GraphQL API directly; the daemon handles token refresh and auth header injection transparently.

## Usage

```sh
WORKFLOWS_AUTH_DAEMON_CONFIG=config.yaml \
WORKFLOWS_AUTH_DAEMON_SUBJECT=<oidc-subject> \
cargo run
```

The subject identifies the user whose stored refresh token to load from the database.

## Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/` | `POST` | Authenticated proxy to the configured GraphQL endpoint |
| `/healthz` | `GET` | Health check (returns 202) |

