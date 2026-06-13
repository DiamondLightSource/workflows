# auth-daemon

 Sidecar HTTP proxy that injects valid OIDC access tokens into GraphQL requests made from within Argo workflows. Workflows call the daemon on `localhost` instead of the GraphQL API directly; the daemon handles token refresh and auth header injection transparently.

## Usage

```sh
WORKFLOWS_AUTH_DAEMON_CONFIG=config.yaml cargo run -- serve
```

The daemon resolves the subject (the user whose stored refresh token to load) at startup by inspecting its own pod: it reads its namespace from the service-account mount and its pod name from `/etc/hostname`, looks up that pod's `workflows.argoproj.io/workflow` label to find the owning workflow, then reads that workflow's `workflows.argoproj.io/creator` label — all via the Kubernetes API. No auth-specific environment variables are required. Its service account needs `get` access to `pods` and `workflows.argoproj.io` in its namespace.

## Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/` | any | Authenticated proxy to the configured GraphQL endpoint |
| `/healthz` | `GET` | Health check (returns 202) |

