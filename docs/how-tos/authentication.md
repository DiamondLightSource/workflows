# Authentication

Workflows uses [Keycloak](https://dev-guide.diamond.ac.uk/authn/how-tos/request-a-registration-with-keycloak/) for authentication.

# User Instructions

## How to call the Federated Graph from within a Workflow

Diamond-II services are accessible via the [federated graph](https://dev-guide.diamond.ac.uk/the_graph/).
All GraphQL queries, mutations, and subscriptions require [authentication through Keycloak](https://dev-guide.diamond.ac.uk/authn/).

To enable authenticated access from a workflow, the following requirements must be met:

- The workflow template must include the annotation `workflows.diamond.ac.uk/authenticated: "true"`.
- The user submitting the Workflow must have logged in to <https://workflows.diamond.ac.uk>.

When this annotation is present, the `GRAPH_URL` environment variable is automatically injected into the workflow. Applications running within the workflow can use this URL when making GraphQL queries and mutations.
Authentication is handled automatically, there is no need to add `Authorization: Bearer ...` headers to your requests.
Requests **must** be sent via `GRAPH_URL`. Direct requests to [graph.diamond.ac.uk](https://graph.diamond.ac.uk) still require Keycloak authentication.

For example:

```
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: example-authenticated-workflow
spec:
  entrypoint: get-workflow-templates

  templates:
    - name: get-workflow-templates
      metadata:
        annotations:
          workflows.diamond.ac.uk/authenticated: "true"
      container:
        image: curlimages/curl:8.12.1
        command: [sh, -c]
        args:
          - |
            curl \
              -X POST \
              "${GRAPH_URL}" \
              -H 'Content-Type: application/json' \
              --data '{"query":"query WorkflowTemplates { workflowTemplates { nodes { name } } }"}'
```

## How to access Tiled from within a Workflow

[Tiled](https://tiled.diamond.ac.uk) is accessible from authenticated workflows. To enable authenticated access, the same requirements as for the Federated Graph apply:

- The workflow template must include the annotation `workflows.diamond.ac.uk/authenticated: "true"`.
- The user submitting the Workflow must have logged in to <https://workflows.diamond.ac.uk>.

When this annotation is present, the `TILED_URL` environment variable is automatically injected into the workflow. Applications running within the workflow can use this URL with the Tiled Python client. Authentication is handled automatically — there is no need to supply credentials or an `Authorization: Bearer ...` header yourself.

Requests **must** be sent via `TILED_URL`. Direct requests to [tiled.diamond.ac.uk](https://tiled.diamond.ac.uk) still require Keycloak authentication.

The Tiled Python client normally tries to run its own login flow when you connect. Because the platform already attaches the authenticated user's credentials to requests sent via `TILED_URL` you should supply a **no-op auth** so the client does not attempt a separate login.

For example:

```
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: example-tiled-workflow-
spec:
  entrypoint: read-tiled-data

  templates:
    - name: read-tiled-data
      metadata:
        annotations:
          workflows.diamond.ac.uk/authenticated: "true"
      script:
        image: ghcr.io/bluesky/tiled:latest
        command: ["python"]
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: "1"
            memory: 1Gi
        source: |
          import os
          from itertools import islice

          import httpx2 as httpx
          from tiled.client import from_uri

          class WorkflowsAuth(httpx.Auth):
              """No-op auth: the platform attaches the authenticated user's
              credentials to requests sent through TILED_URL, so don't attempt
              a separate login flow."""

              def auth_flow(self, request):
                  yield request

          client = from_uri(
              os.environ["TILED_URL"],
              auth=WorkflowsAuth(),
          )

          print(f"Connected to Tiled catalog: {client}")
          print(f"Top-level nodes: {list(islice(client, 10))}")
```

# Developer Instructions

## How to Set up a Keycloak Client to work with Workflows via the Graph

When you [request a Keycloak client](https://jira.diamond.ac.uk/servicedesk/customer/portal/5/create/176), **you must ask for**:

- **Audience:** `graph`

When you use the client to **acquire an access token**, **you must request**:

- **Scope:** `posix-uid`

### What these mean

- **Audience (`graph`)**: tells Keycloak to issue a token intended for _The Graph_. Without this, Workflows may reject the token as "not meant for me".
- **Scope (`posix-uid`)**: tells Keycloak to include the POSIX user identity information Workflows expects to see in the token. Without this, you may be unable to submit jobs.

If you have authentication problems, contact the Diamond Workflows Slack channel:
[#workflows](https://diamondlightsource.slack.com/archives/C08NYJSGMFD)
