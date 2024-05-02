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
vcluster connect workflows-cluster -- helm install workflows charts/workflows
```