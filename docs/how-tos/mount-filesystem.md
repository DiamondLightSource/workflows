# Mount the Filesystem

## Preface

This guide will describe how to mount the session directory of the Diamond filesystem to a workflow Task. Filesystem access can be achieved by performing a [`hostPath` mount](#hostpath-mount) on your task container.

## HostPath Mount

Session directories can be accessed using a [`hostPath` volume mount](https://kubernetes.io/docs/concepts/storage/volumes/#hostpath). To configure this we must:

- Declare a `hostPath` volume by creating a `spec.templates[].volumes` entry where the `path` points to the session directory we intend to mount and the `type` is set to `Directory`, as:
```yaml
spec:
  templates:
  - volumes:
    - name: session
      hostPath:
        path: /dls/i03/data/2024/cm37235-2
        type: Directory
```
- Mount the volume by creating a `spec.templates[].container.volumeMounts` entry which selects the volume by `name` and declares a `mountPath` to which the volume will appear, as:
```yaml
spec:
  templates:
  - container:
      volumeMounts:
        - name: session
          mountPath: /dls/session
```

!!! tip "GPFS Access"

    This access will be via the Network File System (NFS), see the [GPFS](#gpfs) section if you require greater bandwidth or consistency.

!!! example "NFS Access"

    A Workflow executing a `busybox` instance which prints the directory tree at `/dls/session` is shown below:

    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      name: hostpath-mount
    spec:
      entrypoint: hostpath-mount-example
      templates:
      - name: hostpath-mount-example
        container:
          image: docker.io/library/busybox:latest
          command: 
          - tree
          - /dls/session
          volumeMounts:
            - name: session
              mountPath: /dls/session
        volumes:
        - name: session
          hostPath:
            path: /dls/i03/data/2024/cm37235-2
            type: Directory
    ```

### GPFS

Some cluster nodes allow access to the filesystem via the General Parallel File System (GPFS), this allows for a greater bandwidth and consistency than nodes using NFS. These nodes are marked with a set of [taints](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) and [labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/); Hence to schedule our workflow on a node using with GPFS filesystem access, we must:

- Specify a [toleration](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) for the [taint](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) to `spec.templates[].tolerations[]` with a `key` of `nodetype`, an `operator` of `Equal`, and a `value` of `cs05r_gpfs`, as:
```yaml
spec:
  templates:
  - tolerations:
    - key: nodetype
      operator: Equal
      value: cs05r_gpfs
```

!!! note "Reserved Nodes"

    You may need to apply an additional toleration for `science_group` in order to access a node with GPFS filesystem access. Please only do so if you have been given appropriate permission

- Provide an [affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity) for nodes which have GPFS by adding a label selector to `spec.templates[].affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[].matchExpressions[]` with a `key` of `has_gpfs03` or `has_gpfs04`, an `operator` of `In`, and with an entry in `values` of `true`, as:
```yaml
spec:
  templates:
  - affinity:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: has_gpfs03
              operator: In
              values:
              - "true"
```


!!! tip "Prefer GPFS"

    If GPFS is not a strict requirement for your task but is prefered you can use `preferredDuringSchedulingIgnoredDuringExecution`, as:
    ```yaml
    spec:
      templates:
      - affinity:
          nodeAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - preference:
              - matchExpressions:
                - key: has_gpfs03
                  operator: In
                  values:
                  - "true"
    ```

!!! example "GPFS Access"

    A Workflow executing a `busybox` instance which prints the directory tree at `/dls/session` with access via GPFS is shown below:

    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      name: hostpath-mount
    spec:
      entrypoint: hostpath-mount-example
      templates:
      - name: hostpath-mount-example
        container:
          image: docker.io/library/busybox:latest
          command: 
          - tree
          - /dls/session
          volumeMounts:
            - name: session
              mountPath: /dls/session
        volumes:
        - name: session
          hostPath:
            path: /dls/i03/data/2024/cm37235-2
            type: Directory
        tolerations:
        - key: nodetype
          operator: Equal
          value: cs05r_gpfs
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
              - matchExpressions:
                - key: has_gpfs03
                  operator: In
                  values:
                  - "true"
    ```

