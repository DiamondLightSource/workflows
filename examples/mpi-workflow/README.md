# MPI Workflow Notes

Use this directory as a reference for running MPI jobs through Argo + MPI Operator.

## Required Workflow Settings

- Add this `podSpecPatch` so Argo can write temporary manifests under `/tmp` before creating resources:

```yaml
podSpecPatch: |
  volumes:
    - name: argo-tmp
      emptyDir: {}
  initContainers:
    - name: init
      volumeMounts:
        - name: argo-tmp
          mountPath: /tmp
  containers:
    - name: main
      volumeMounts:
        - name: argo-tmp
          mountPath: /tmp
    - name: wait
      volumeMounts:
        - name: argo-tmp
          mountPath: /tmp
```

- In the `resource` template for `MPIJob`, set:

```yaml
setOwnerReference: true
```

- In the embedded `MPIJob` manifest metadata, include:

```yaml
metadata:
  labels:
    kueue.x-k8s.io/queue-name: default-queue
```

- In the `resource` template for `MPIJob`, set the success and failure conditions to monitor the status of the mpi job:
```yaml
resource:
    successCondition: status.replicaStatuses.Launcher.succeeded == 1
    failureCondition: status.replicaStatuses.Launcher.failed > 0
```

## Prebuilt UID Images

Many prebuilt MPI images assume fixed users/UIDs. But all the containers are forced to run with the same UID as the user running the workflow.
So if you use any prebuild MPI images directly, you may encoounter premission issues.

This example uses an `entrypoint.sh` with `nss_wrapper` so containers can run with arbitrary runtime UIDs.

You can reuse `entrypoint.sh` in your own image builds.
