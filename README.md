# Workflows

The data analysis workflows platform deployment. The deployment consists of a Kubernetes virtual cluster (vcluster), in which Argo Workflows is deployed

## Deployment

The workflow engine can be deployed using Helm in two stages:

First, deploy the workflows virtual cluster:
```sh
helm install workflows-cluster charts/workflows-cluster
```

Secondly, deploy the workflows service in the virtual cluster:
```sh
vcluster connect workflows-cluster -- helm install workflows charts/workflows -n workflows --create-namespace
```

Finally, deploy the events service in the virtual cluster:
```sh
vcluster connect workflows-cluster -- helm install events charts/events -n events --create-namespace
```

## Deployment in developer mode

First, deploy the workflows virtual cluster using the developer manifest:
```sh
helm install workflows-cluster charts/workflows-cluster -f charts/workflows-cluster/dev-values.yaml
```

Secondly, deploy the workflows service in the virtual cluster using the developer manifest:
```sh
vcluster connect workflows-cluster -- helm install workflows charts/workflows -n workflows -f charts/workflows/dev-values.yaml --create-namespace
```
Note that for getting the workflows-server to run inside the dev environment it is necessary to extract the argo-server-sso secret, delete the deployed sealed secret and then deploy a new sealed secret using ```kubectl create -f <SEALED-SECRET>``` inside the virtual cluster.

Finally, deploy the events service in the virtual cluster using the developer manifest:
```sh
vcluster connect workflows-cluster -- helm install events charts/events -n events -f charts/events/dev-values.yaml --create-namespace
```

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
