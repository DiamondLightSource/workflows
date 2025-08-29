# Workflows for Science Applications

!!! info "Science applications"
    This tutorial is based on a specific ptychography use case where the [PtyPy](https://www.ptypy.org)
    software is used to reconstruct high-resolution images from diffraction data collected at one of
    Diamond's ptychography beamlines. Other use cases might differ, but the general steps needed to
    set up a workflow are likely going to be quite similar.

## Containerising the Application

The first step is to build a [container](https://dev-portal.diamond.ac.uk/guide/kubernetes/tutorials/containers/)
for PtyPy, for example the following multi-stage Dockerfile in the box below

??? example "Dockerfile"
    ```dockerfile
    # Select MPI environment: openmpi or mpich
    ARG MPI=openmpi

    # Select Platform: core, full, pycuda or cupy
    ARG PLATFORM=cupy

    # Select CUDA version
    ARG CUDAVERSION=12.4

    # Pull from mambaforge and install XML and ssh
    FROM condaforge/mambaforge as base
    ENV DEBIAN_FRONTEND=noninteractive
    RUN apt-get update && apt-get install -y libxml2 ssh

    # Pull from base image and install OpenMPI/MPICH
    FROM base as mpi
    ARG MPI
    RUN mamba install -n base -c conda-forge ${MPI}

    # Pull from MPI build install core dependencies
    FROM base as core
    COPY ./dependencies_core.yml ./dependencies.yml
    RUN mamba env update -n base -f dependencies.yml

    # Pull from MPI build and install full dependencies
    FROM mpi as full
    COPY ./dependencies_full.yml ./dependencies.yml
    RUN mamba env update -n base -f dependencies.yml

    # Pull from MPI build and install accelerate/pycuda dependencies
    FROM mpi as pycuda
    ARG CUDAVERSION
    COPY ./ptypy/accelerate/cuda_pycuda/dependencies.yml ./dependencies.yml
    COPY ./cufft/dependencies.yml ./dependencies_cufft.yml
    RUN mamba install cuda-version=${CUDAVERSION} && \
        mamba env update -n base -f dependencies.yml && \
        mamba env update -n base -f dependencies_cufft.yml

    # Pull from MPI build and install accelerate/cupy dependencies
    FROM mpi as cupy
    ARG CUDAVERSION
    COPY ./ptypy/accelerate/cuda_cupy/dependencies.yml ./dependencies.yml
    COPY ./cufft/dependencies.yml ./dependencies_cufft.yml
    RUN mamba install cuda-version=${CUDAVERSION} && \
        mamba env update -n base -f dependencies.yml && \
        mamba env update -n base -f dependencies_cufft.yml

    # Pull from platform specific image and install ptypy 
    FROM ${PLATFORM} as build
    COPY pyproject.toml setup.py ./
    COPY ./scripts ./scripts
    COPY ./templates ./templates
    COPY ./benchmark ./benchmark
    COPY ./cufft ./cufft
    COPY ./ptypy ./ptypy
    RUN pip install .

    # For core/full build, no post processing needed
    FROM build as core-post
    FROM build as full-post

    # For pycuda build, install filtered cufft
    FROM build as pycuda-post
    RUN pip install ./cufft

    # For pycuda build, install filtered cufft
    FROM build as cupy-post
    RUN pip install ./cufft

    # Platform specific runtime container
    FROM ${PLATFORM}-post as runtime

    # Run PtyPy run script as entrypoint
    ENTRYPOINT ["ptypy.run"]
    ```

### Building a container

To build a container image `ptypy-container` with openmpi as the MPI backend and CuPy as the backend for PtyPy, 
we can use the following podman command

```bash
podman build . -t ptypy-container --target=runtime --build-arg MPI=openmpi --build-arg PLATFORM=cupy
```

### Publishing a container

If we wish to publish our container, we could do so by pushing it to
Diamond's container registry on the Google cloud,
see [here](https://dev-portal.diamond.ac.uk/guide/kubernetes/tutorials/containers/) details on how to set this up.
Now we can change the tag of our image

```bash
podman tag ptypy-container gcr.io/diamond-privreg/ptypy/test_openmpi_cupy:0.1
```

and push

```bash
podman push gcr.io/diamond-privreg/ptypy/test_openmpi_cupy:0.1
```

## Cluster Workflow Templates

The next step is to create a ```ClusterWorkFlowTemplate``` and push it to the corresponding GitHub
repository for science workflows, in this case [imaging-workflows](https://github.com/DiamondLightSource/imaging-workflows).
We run continuos deployment with ArgoCD which will automatically look for existing templates in those
repositories and make them available to the Argo workflows controller such that the template are visible
via the [dashboard](https://workflows.diamond.ac.uk) or the graph (once available).

!!! note "Workflow template repositories"
    If there is currently no workflow repository for your science area, send a message to a
    member of the analysis platform team and we can get it sorted and configure the workflow
    engine to automatically pick up your workflow templates from the new repository.

## Writing a Cluster Workflow Template

Cluster Workflow Templates are largely the same as [Workflow Templates](../how-tos/submit-workflow.md)
with a basic structure looking like this

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: ptypy-cpu-job
spec:
  entrypoint: ptypy-run
  templates:
  - name: ptypy-run
    container:
      image: gcr.io/diamond-privreg/ptypy/test_openmpi_full:0.1
```

defining a `ClusterWorkflowTemplate` resource with a given name (`ptypy-cpu-job`) and a list of tasks. Here, we
provide a single task named ```ptypy-run``` based on the container image we have built in the step above.
We can also specify which task serves as the entry point and will run first (in the case of a multi-task workflow).

### Workflow Parameterization

For each task, we need to specify a command and its arguments that we would like to be executed inside the container

```yaml
  templates:
  - name: ptypy-run
    inputs:
      parameters:
      - name: config
      - name: id
      - name: output
      - name: nprocs
        value: 1
    container:
      image: gcr.io/diamond-privreg/ptypy/test_openmpi_full:0.1
      command:
      - mpirun
      args: 
      - "-n"
      - "{{ inputs.parameters.nprocs }}"
      - "ptypy.cli"
      - "-j"
      - "{{ inputs.parameters.config }}"
      - "-i", "{{ inputs.parameters.id }}"
      - "-o", "{{ inputs.parameters.output }}"
      - "-s", "hdf5_loader"
```

We can also specify parameters like a scan id, additional configuration as a JSON string or the number of processes and
template those parameters into the command arguments.

### Mounting the /dls Filesystem

As described in the how-to on [mounting a fileystem](../how-tos/mount-filesystem.md) we can declare
a hostPath volume and mount it into our container using a parameter ```visitdir``` that we fetch from
the ```sessionspaces``` configMap to describe the path to the visit directory in /dls.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: ptypy-cpu-job
spec:
  entrypoint: ptypy-run
  arguments:
    parameters:
    - name: visitdir
      valueFrom:
        configMapKeyRef:
          name: sessionspaces
          key: data_directory
  templates:
  - name: ptypy-run
    container:
      volumeMounts:
      - name: session
        mountPath: "{{ workflow.parameters.visitdir }}"
    volumes:
    - name: session
      hostPath:
        path:  "{{ workflow.parameters.visitdir }}"
        type: Directory
```

### CPU cluster resources

By default, each pod on the cluster is allocating a single CPU and 1 GB of memory.
If we would like to specify different resources, we can do so by providing a ```podSpecPatch```
to the main workflow pod

```yaml

  templates:
  - name: ptypy-run
    inputs:
      parameters:
      - name: nprocs
        value: 1
      - name: memory
        value: 20Gi
    podSpecPatch: |
      containers:
        - name: main
          resources:
            requests:
              cpu: "{{ inputs.parameters.nprocs }}"
              memory: "{{ inputs.parameters.memory }}"
            limits:
              cpu: "{{ inputs.parameters.nprocs }}"
              memory: "{{ inputs.parameters.memory }}"
```

and use input parameters for the number of CPUs (```nprocs```) and the requested memory (```memory```)
like described above.

### GPU resources

For GPU jobs, we need to add entries for  ```nvidia.com/gpu``` in both the resource ```requests``` and 
```limits```. In addition, we also need to add some ```tolerations```:

```yaml
  templates:
  - name: ptypy-run
    inputs:
      parameters:
      - name: nprocs
        value: 1
      - name: memory
        value: 20Gi
    podSpecPatch: |
      containers:
        - name: main
          resources:
            requests:
              cpu: "{{ inputs.parameters.nprocs }}"
              memory: "{{ inputs.parameters.memory }}"
              nvidia.com/gpu: "{{ inputs.parameters.nprocs }}"
            limits:
              cpu: "{{ inputs.parameters.nprocs }}"
              memory: "{{ inputs.parameters.memory }}"
              nvidia.com/gpu: "{{ inputs.parameters.nprocs }}"
    tolerations:
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule
    - key: nodetype
      operator: Equal
      value: gpu
      effect: NoSchedule
```

### Non-root container execution

For security reasons, workflow pods are only allowed to run with non-root users,
this means that the application running inside the container won't have write access
to anything except mounted directories.
Some applications will need to write to locations such as ```/tmp```.
In those cases, it makes sense to add a volume claim for a temporary directory
to our template and mount it into our container like so

```yaml
  spec:
    entrypoint: ptypy-run
    volumeClaimTemplates:
    - metadata:
        name: tmpdir
        spec:
        accessModes: [ "ReadWriteOnce" ]
        resources:
            requests:
            storage: 1Gi
        storageClassName: netapp
    templates:
    - name: ptypy-run
      container:
        volumeMounts:
        - name: tmpdir
          mountPath: /tmp  
```

## Examples

This tutorial is by no means complete, but the two examples below might
be a good starting point for your specific science application/workflow.

??? Example "PtyPy CPU workflow template"
    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: ClusterWorkflowTemplate
    metadata:
      name: ptypy-cpu-job
    spec:
      entrypoint: ptypy-run
      volumeClaimTemplates:
      - metadata:
          name: tmpdir
        spec:
          accessModes: [ "ReadWriteOnce" ]
          resources:
            requests:
              storage: 1Gi
          storageClassName: netapp
      arguments:
        parameters:
        - name: visitdir
          valueFrom:
            configMapKeyRef:
              name: sessionspaces
              key: data_directory
      templates:
      - name: ptypy-run
        inputs:
          parameters:
          - name: config
          - name: id
          - name: output
            value: /tmp/output
          - name: nprocs
            value: 1
          - name: memory
            value: 20Gi
        container:
          image: gcr.io/diamond-privreg/ptypy/test_openmpi_full:0.1
          command:
          - mpirun
          args: ["-n", "{{ inputs.parameters.nprocs }}", "ptypy.cli", "-j", "{{ inputs.parameters.config }}", "-i", "{{ inputs.parameters.id }}", "-o", "{{ inputs.parameters.output }}", "-s", "hdf5_loader"]
          volumeMounts:
          - name: session
            mountPath: "{{ workflow.parameters.visitdir }}"
          - name: tmpdir
            mountPath: /tmp
        podSpecPatch: |
          containers:
          - name: main
            resources:
              requests:
                cpu: "{{ inputs.parameters.nprocs }}"
                memory: "{{ inputs.parameters.memory }}"
              limits:
                cpu: "{{ inputs.parameters.nprocs }}"
                memory: "{{ inputs.parameters.memory }}"
        volumes:
        - name: session
          hostPath:
            path:  "{{ workflow.parameters.visitdir }}"
            type: Directory
    ```

??? Example "PtyPy GPU workflow template"
    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: ClusterWorkflowTemplate
    metadata:
      name: ptypy-gpu-job
    spec:
      entrypoint: ptypy-run
      volumeClaimTemplates:
      - metadata:
          name: tmpdir
        spec:
          accessModes: [ "ReadWriteOnce" ]
          resources:
            requests:
              storage: 1Gi
          storageClassName: netapp
      arguments:
        parameters:
        - name: visitdir
          valueFrom:
            configMapKeyRef:
              name: sessionspaces
              key: data_directory
      templates:
      - name: ptypy-run
        inputs:
          parameters:
          - name: config
          - name: id
          - name: output
            value: /tmp/output
          - name: nprocs
            value: 1
          - name: memory
            value: 20Gi
        container:
          image: gcr.io/diamond-privreg/ptypy/test_openmpi_cupy:0.1
          env:
          - name: CUPY_CACHE_DIR
            value: /tmp/.cupy/kernel_cache
          command:
          - mpirun
          args: ["-n", "{{ inputs.parameters.nprocs }}", "ptypy.cli", "-j", "{{ inputs.parameters.config }}", "-i", "{{ inputs.parameters.id }}", "-o", "{{ inputs.parameters.output }}", "-s", "hdf5_loader", "-b", "cupy"]
          volumeMounts:
          - name: session
            mountPath: "{{ workflow.parameters.visitdir }}"
          - name: tmpdir
            mountPath: /tmp
        podSpecPatch: |
          containers:
          - name: main
            resources:
              requests:
                cpu: "{{ inputs.parameters.nprocs }}"
                memory: "{{ inputs.parameters.memory }}"
                nvidia.com/gpu: "{{ inputs.parameters.nprocs }}"
              limits:
                cpu: "{{ inputs.parameters.nprocs }}"
                memory: "{{ inputs.parameters.memory }}"
                nvidia.com/gpu: "{{ inputs.parameters.nprocs }}"
        tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
        - key: nodetype
          operator: Equal
          value: gpu
          effect: NoSchedule
        volumes:
        - name: session
          hostPath:
            path:  "{{ workflow.parameters.visitdir }}"
            type: Directory
    ```
