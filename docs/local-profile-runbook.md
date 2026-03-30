# Local Profile Runbook

This document records the local-profile changes that were made to get the
`workflows` repo runnable on a local Kubernetes cluster without changing the
repo-pinned component versions.

The current supported local path is a direct chart install into a disposable
cluster. It does not use `charts/workflows-cluster`, Argo CD, or vcluster.

## Current Status

The local profile is working for the core stack:

- `workflows` installs and runs locally
- Argo server UI and API are available locally
- `graph-proxy` installs and serves GraphQL locally
- starter `ClusterWorkflowTemplate`s are installed automatically
- GraphQL submission works
- submitted workflows complete and reach `Succeeded`

The local profile does not currently install a usable dashboard by default on
arm64 machines because:

- the published dashboard image does not provide a compatible arm64 manifest
- the local dashboard build depends on `frontend/supergraph.graphql`, which is
  produced in CI and is not committed to the repo

## What Changed

### 1. Local bootstrap script

File:

- `scripts/local-profile-up.sh`

Purpose:

- create or reuse a dedicated local cluster
- install the local overlays directly from the workspace
- build and load local images only when needed
- seed a fake visit namespace that the rest of the stack can target
- install starter templates for local submissions

Key behavior:

- prefers `kind` with cluster name `workflows-local`
- falls back to a dedicated `minikube` profile with the same name
- supports `WORKFLOWS_LOCAL_KUBE_CONTEXT` to target an existing cluster
- auto-builds `graph-proxy` on arm64
- skips dashboard installation when the required local dashboard artifact is
  missing

Important bootstrap fixes:

- stale static sessionspaces are adopted before Helm reapplies them
- the `artifact-s3` secret is copied into the fake visit namespace
- the script no longer waits for a per-visit `LocalQueue` in local mode
- the one-command flow now completes cleanly again

### 2. Local Argo/workflows overlay

Files:

- `charts/workflows/local-values.yaml`
- `charts/workflows/templates/local-secrets.yaml`

Purpose:

- disable shared-environment assumptions
- provide local secrets and artifact storage
- run Argo server in `server` auth mode locally

Key local settings:

- `postgresql-ha.enabled: false`
- `oauth2-proxy.enabled: false`
- `s3mock.enabled: true`
- `localSecrets.create: true`
- `workflowQueuePolicies.enabled: false`

The most important fix here was the local S3 endpoint:

- Argo must use `workflows-s3mock.workflows.svc.cluster.local`
- it must not use `:9090` in the Argo artifact repository config, because the
  S3 mock Service exposes port `80` and forwards that to container port `9090`

That mismatch was the real reason workflows were getting stuck earlier: the
`wait` sidecar timed out when uploading archived logs, so workflows never
completed.

### 3. Local Kueue overlay

File:

- `charts/kueue/local-values.yaml`

Purpose:

- keep Kueue installed locally without letting it evict short-lived Argo pods

Key local settings:

- `createDefaultLocalQueues: false`
- `waitForPodsReady.enable: false`

This keeps the Kueue controller in the stack, but removes the local pod
readiness eviction path that was interfering with Argo workflows during early
debugging.

### 4. Local sessionspaces strategy

Files:

- `charts/sessionspaces/local-values.yaml`
- `charts/sessionspaces/templates/static-sessions.yaml`

Purpose:

- avoid depending on live ISPyB + LDAP + Diamond namespace creation flow just to
  run workflows locally

Current local approach:

- `controller.enabled: false`
- `database.create: false`
- one static visit namespace is seeded: `cm37235-3`

That namespace is labelled as a static sessionspace and gets:

- a `sessionspaces` configmap
- an `argo-workflow` service account and binding
- a copied `artifact-s3` secret

This gives the rest of the stack a fake but valid visit namespace to target
without needing live session creation.

### 5. Local graph-proxy overlay

Files:

- `charts/graph-proxy/local-values.yaml`
- `charts/graph-proxy/templates/artifact-secret.yaml`

Purpose:

- point graph-proxy at the in-cluster Argo server and local S3 mock
- create the S3 credentials it needs in local mode

Key local settings:

- `argoServerUrl: http://workflows-argo-workflows-server.workflows.svc.cluster.local:2746`
- `kubernetesApiUrl: https://kubernetes.default.svc`
- `s3.url: http://workflows-s3mock.workflows.svc.cluster.local:9090`
- local `artifact-s3-secret` creation enabled
- tracing/metrics endpoints disabled

On arm64, the local helper builds and loads `backend/Dockerfile.graph-proxy`
into the cluster instead of relying on the published image.

### 6. Local dashboard overlay

File:

- `charts/dashboard/local-values.yaml`

Purpose:

- provide a local dashboard config when a local-compatible image is available

Key local settings:

- Keycloak disabled
- local graph URLs pointed at localhost port-forwards
- ingress disabled

Current limitation:

- dashboard is intentionally skipped unless `frontend/supergraph.graphql`
  exists locally and a compatible local image can be built

### 7. Starter templates

File:

- `examples/local-templates/starter-templates.yaml`

Installed automatically:

- `local-hello-world`
- `local-conditional-steps`
- `local-subscription-benchmark`

These are lightweight templates intended specifically for local submission and
GraphQL testing.

### 8. Documentation

File:

- `docs/local-development.md`

This was updated to match the actual local contract:

- core local stack first
- dashboard optional
- arm64 behavior documented
- Kueue local behavior documented
- starter templates documented

## Backend / Rust Change Review

This section covers the backend-side changes that were part of the local-profile
work and whether they are still necessary.

### `backend/graph-proxy/src/main.rs`

Current local-relevant behavior:

- if telemetry setup does not provide a meter provider, graph-proxy falls back
  to a no-op meter provider instead of failing

Assessment:

- this is still useful and likely necessary for local mode
- the local graph-proxy overlay disables tracing and metrics endpoints, so a
  no-op metrics path is the correct behavior
- this is not what fixed workflow completion; the Argo fix was the S3 endpoint
  change
- but it is still a defensible backend change for local runs

### `backend/graph-proxy/src/metrics.rs`

Current local-relevant behavior:

- defines `noop::NoopMeterProvider`

Assessment:

- paired with the `main.rs` fallback above
- still useful for local mode and test environments with telemetry disabled

### `backend/sessionspaces/src/main.rs`

Current local-relevant behavior:

- supports `SKIP_LDAP=true`
- allows `LDAP_URL` to be omitted when LDAP is explicitly skipped

Assessment:

- useful if you want to run the sessionspaces polling service locally
- not required for the current static local profile, because the local profile
  disables the sessionspaces controller and uses static seeded namespaces

### `backend/sessionspaces/src/permissionables/mod.rs`

Current local-relevant behavior:

- when LDAP is skipped, synthetic GIDs are generated so session objects are
  still complete enough to render into Kubernetes resources

Assessment:

- same story as above: useful for a future “real local sessionspaces service”
  mode
- not required for the currently working static sessionspace bootstrap

### Overall backend conclusion

Necessary or still justified:

- graph-proxy no-op metrics fallback

Useful but not required for the current working local stack:

- sessionspaces `SKIP_LDAP`
- sessionspaces synthetic GIDs when LDAP is skipped

Not the root cause of the Argo completion bug:

- any Rust/backend code

The workflow completion failure was caused by local chart wiring, specifically
the wrong S3 service endpoint in the Argo local overlay.

## How To Run Locally

### Prerequisites

You need:

- Docker running
- `kubectl`
- `helm`
- either `kind` or `minikube`

### Bring up the stack

Run:

```sh
./scripts/local-profile-up.sh
```

Optional overrides:

```sh
WORKFLOWS_LOCAL_KUBE_CONTEXT=<context> ./scripts/local-profile-up.sh
WORKFLOWS_LOCAL_UID="$(id -u)" ./scripts/local-profile-up.sh
WORKFLOWS_LOCAL_BUILD_IMAGES=true ./scripts/local-profile-up.sh
WORKFLOWS_LOCAL_REBUILD_IMAGES=true ./scripts/local-profile-up.sh
WORKFLOWS_LOCAL_INSTALL_DASHBOARD=true ./scripts/local-profile-up.sh
```

### Architecture behavior

On linux/amd64:

- the local profile uses published images by default

On arm64:

- the local profile auto-builds and loads `graph-proxy`
- dashboard is skipped unless `frontend/supergraph.graphql` exists

## How To Access It

### Argo UI

Run:

```sh
kubectl --context workflows-local -n workflows port-forward svc/workflows-argo-workflows-server 2746:2746
```

Open:

- `http://localhost:2746`

### GraphQL

Run:

```sh
kubectl --context workflows-local -n graph-proxy port-forward svc/graph-proxy 8081:80
```

Use:

- `http://localhost:8081/graphql`

### Dashboard

If the dashboard was installed:

```sh
kubectl --context workflows-local -n dashboard port-forward svc/dashboard 8080:80
```

Open:

- `http://localhost:8080`

If the dashboard was not installed, that means the local build prerequisites for
the frontend were not met, usually because `frontend/supergraph.graphql` is
missing.

## Local Visit / Namespace

The seeded local visit is:

- proposal code: `cm`
- proposal number: `37235`
- visit number: `3`
- namespace: `cm37235-3`

Use that visit in GraphQL examples and local testing.

## Example GraphQL Queries

List templates:

```graphql
query {
  workflowTemplates(limit: 10) {
    edges {
      node {
        name
      }
    }
  }
}
```

List workflows for the local visit:

```graphql
query GetWorkflows($visit: VisitInput!, $limit: Int!) {
  workflows(visit: $visit, limit: $limit) {
    edges {
      node {
        name
        status {
          __typename
        }
      }
    }
  }
}
```

Variables:

```json
{
  "visit": {
    "proposalCode": "cm",
    "proposalNumber": 37235,
    "number": 3
  },
  "limit": 10
}
```

## Example GraphQL Mutations

Submit `local-hello-world`:

```graphql
mutation SubmitHello($visit: VisitInput!) {
  submitWorkflowTemplate(
    name: "local-hello-world"
    visit: $visit
    parameters: {}
  ) {
    name
  }
}
```

Variables:

```json
{
  "visit": {
    "proposalCode": "cm",
    "proposalNumber": 37235,
    "number": 3
  }
}
```

Submit `local-conditional-steps`:

```graphql
mutation SubmitConditional($visit: VisitInput!) {
  submitWorkflowTemplate(
    name: "local-conditional-steps"
    visit: $visit
    parameters: {}
  ) {
    name
  }
}
```

Submit `local-subscription-benchmark`:

```graphql
mutation SubmitSubscriptionBenchmark($visit: VisitInput!) {
  submitWorkflowTemplate(
    name: "local-subscription-benchmark"
    visit: $visit
    parameters: {}
  ) {
    name
  }
}
```

## Quick Verification Steps

### Verify starter templates are installed

```sh
kubectl --context workflows-local get clusterworkflowtemplates
```

### Verify Argo can execute a workflow

Submit through GraphQL or Argo, then check:

```sh
kubectl --context workflows-local -n cm37235-3 get workflow
```

Expected result:

- submitted workflow reaches `Succeeded`

### Verify Argo server API

After port-forwarding:

```sh
curl http://127.0.0.1:2746/api/v1/info
```

### Verify GraphQL

After port-forwarding:

```sh
curl -s http://127.0.0.1:8081/graphql \
  -H 'content-type: application/json' \
  --data '{"query":"query { workflowTemplates(limit: 5) { edges { node { name } } } }"}'
```

## Known Limitations

- dashboard is optional and currently absent on arm64 unless the CI-produced
  schema artifact is available locally
- the local profile uses static seeded sessionspaces rather than full live
  sessionspace discovery
- this is a local execution profile, not a full parity reproduction of Diamond
  cluster infrastructure

