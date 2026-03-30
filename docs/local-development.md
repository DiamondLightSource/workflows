# Local Development

The supported local path is a direct chart install into a disposable cluster.
It does not use `charts/workflows-cluster`, Argo CD, or vcluster.

## Scope

The local profile installs:

- Kyverno
- Kueue
- Sessionspaces
- Workflows
- Graph Proxy
- A small starter set of local-safe `ClusterWorkflowTemplate`s
- Dashboard when a local-compatible image is available

The local profile intentionally skips:

- `charts/workflows-cluster`
- `charts/apps`
- `charts/argocd`
- `charts/events`
- `charts/groups`
- `charts/otel-collector`

## Bring Up The Stack

Run:

```sh
./scripts/local-profile-up.sh
```

The script creates a `kind` cluster called `workflows-local` if it does not
already exist. If `kind` is not installed, it falls back to a dedicated
`minikube` profile named `workflows-local` so the local stack does not compete
with an existing shared `minikube` profile. You can also point it at an
existing cluster context with `WORKFLOWS_LOCAL_KUBE_CONTEXT=<context>`.

It then builds the required chart dependencies and installs the local cluster
components directly from the workspace. On linux/amd64 it uses the published
GHCR images. On arm64 clusters it will build and load a local `graph-proxy`
image automatically because the published image does not include an arm64
manifest.

On arm64, the dashboard is only installed if `frontend/supergraph.graphql`
exists. The repo does not currently carry that CI-produced artifact.

By default the workflows profile labels submitted workflows with uid `1000`.
To override that, set:

```sh
WORKFLOWS_LOCAL_UID="$(id -u)" ./scripts/local-profile-up.sh
```

## Access The Services

Run these port-forwards in separate terminals:

```sh
kubectl --context <local-context> port-forward -n graph-proxy svc/graph-proxy 8081:80
kubectl --context <local-context> port-forward -n workflows svc/workflows-argo-workflows-server 2746:2746
```

Then open [http://localhost:2746](http://localhost:2746) for the Argo UI.

If the dashboard was installed, also run:

```sh
kubectl --context <local-context> port-forward -n dashboard svc/dashboard 8080:80
```

Then open [http://localhost:8080](http://localhost:8080).

## Optional Frontend-From-Source Flow

If you want to run the dashboard from source instead of the chart:

```sh
cd frontend
cp dashboard/.env.local.example dashboard/.env.local
yarn install
yarn run --cwd=relay-workflows-lib relay
yarn run --cwd=dashboard dev
```

This still requires `frontend/relay-workflows-lib/supergraph.graphql`, which is
normally produced in CI from the graph federation flow.

If you also want the chart-driven dashboard image build on arm64, place the
same artifact at `frontend/supergraph.graphql` before running the local profile
script.

If you have the artifact locally, the source-mode flow is:

```sh
cd frontend
yarn run --cwd=relay-workflows-lib relay
yarn run --cwd=dashboard dev
```

## Notes

- The local `workflows` profile uses `s3mock` and a local `artifact-s3`
  secret. Archive logs stay enabled in the local profile and are written
  through the in-cluster `workflows-s3mock` service.
- The local path is intended to exercise the stack locally, not to match full
  Diamond infrastructure parity.
- The local profile keeps Kueue installed, but disables the local
  `waitForPodsReady` eviction path and disables workflow queue-label policies so
  Argo workflow pods can complete locally without per-visit `LocalQueue`
  bootstrap.
- The local sessionspaces profile seeds a static visit namespace
  `cm37235-3` with a `sessionspaces` configmap, `argo-workflow` service
  account, `visit-member` role binding, and copied `artifact-s3` secret so the
  rest of the stack can run without external LDAP or ISPyB dependencies.
- The local profile also installs starter templates from
  `examples/local-templates/starter-templates.yaml`. These are intended for
  local submission and subscription testing, unlike several of the heavier
  example templates in `examples/conventional-templates/` that assume Diamond
  storage classes.
