# Workflows

The data analysis workflows platform deployment. The deployment consists of a Kubernetes virtual cluster (vcluster), in which Argo Workflows is deployed

Refer to https://diamondlightsource.github.io/workflows/docs for more explanations and tutorials for the workflows.

## Deployment

The workflow engine can be deployed using Helm:

```sh
helm install workflows-cluster charts/workflows-cluster
```

This will install a virtual cluster together with Argo CD, which then installs all other services
inside the vcluster including the workflow engine itself.

To connect to the virtual cluster and run a command inside the vcluster, use

```sh
vcluster connect workflows-cluster -- <COMMAND>
```

## Deployment in developer mode

```sh
helm install workflows-cluster charts/workflows-cluster -f charts/workflows-cluster/dev-values.yaml
```

Note that for getting the workflows-server to run inside the dev environment it is necessary to extract the argo-server-sso secret, delete the deployed sealed secret and then deploy a new sealed secret using `kubectl create -f <SEALED-SECRET>` inside the virtual cluster.

## Serve Docs

Firstly, install `mkdocs` and the requisite dependencies in `docs/requirements.txt`; For this you may wish to use `pipx`, as:

```sh
pipx install mkdocs
pipx runpip mkdocs install -r docs/requirements.txt
```

Now, serve the docs with `mkdocs`:

```sh
mkdocs serve
```

## Accessing the Argo CD dashboard

To access the Argo CD dashboard, we need to use port-forwarding to connect to the argocd-server inside the vcluster

```sh
kubectl -n workflows port-forward svc/argocd-server-x-argocd-x-workflows-cluster 8080:80 &
```

and then open the dashboard on [localhost:8080](localhost:8080). To obtain the admin password, you can use

```sh
vcluster connect workflows-cluster -- argocd admin initial-password -n argocd
```

## Frontend

The `frontend` directory contains all the react components for the workflows. The `workflows-lib` subdirectory containers all the pure components where as `relay-workflows-lib` contains relay components that fetches the data from a workflows proxy.

Refer to https://diamondlightsource.github.io/workflows/storybook to see all the components in storybook.
