# Workflows

The data analysis workflows platform deployment. The deployment consists of a Kubernetes virtual cluster (vcluster), in which Argo Workflows is deployed

Refer to <https://diamondlightsource.github.io/workflows/docs> for more explanations and tutorials for the workflows.

## Deployment

The workflow engine can be deployed using Helm:

```sh
helm install workflows-cluster charts/workflows-cluster
```

This will install a virtual cluster together with [Argo CD](https://argo-cd.workflows.diamond.ac.uk), which then installs all other services
inside the vcluster including the workflow engine itself.

To connect to the virtual cluster and run a command inside the vcluster, use

```sh
vcluster connect workflows-cluster --silent -- <COMMAND>
```

## Deployment in developer mode

```sh
helm install workflows-cluster charts/workflows-cluster -f charts/workflows-cluster/dev-values.yaml
```

If you wish to run workflows, you should override the `uid` in the workflows app with your own uid.

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

The Argo CD dashboard is available at [https://argo-cd.workflows.diamond.ac.uk](https://argo-cd.workflows.diamond.ac.uk).

## Frontend

The `frontend` directory contains all the react components for the workflows. The `workflows-lib` subdirectory containers all the pure components where as `relay-workflows-lib` contains relay components that fetches the data from a workflows proxy.

Refer to <https://diamondlightsource.github.io/workflows/storybook> to see all the components in storybook.
