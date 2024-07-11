# Submit a Workflow

## Preface

This guide will describe how to configure and submit a workflow that is then running in the namespace of a Diamond visit.
It is recommended to build a container for your application and push it to a container registry.
Check the Diamond developer portal for more details on
[Working with Containers](https://dev-portal.diamond.ac.uk/guide/kubernetes/tutorials/containers/).

## Workflow

Workflows can be configured as YAML manifests that include an ```apiVersion```,
declare the ```kind``` and ```Workflow```, and are given a ```name``` in ```metadata```:

```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      name: name-of-the-workflow
```

We can then define a list of tasks as ```spec.templates[]``` and declare an ```entrypoint```.
A task could be specified by a ```container``` with a given ```image``` and ```command```:

```yaml
    spec:
      entrypoint: hello-world-example
      templates:
      - name: hello-world-example
        container:
          image: docker.io/library/busybox:latest
          command: 
          - echo
          - Hello world
```

!!! example "Hello world"

    A Workflow executing a `busybox` instance which prints "Hello world":

    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      name: hello-world-example
    spec:
      entrypoint: hello-world-example
      templates:
      - name: hello-world-example
        container:
          image: docker.io/library/busybox:latest
          command: 
          - echo
          - Hello world
    ```

## Workflow with parameters

Instead of hard-coding the message into the workflow, we can define a parameter ```message``` and
modify the ```command``` to reference our parameter using ```{{ inputs.parameters.message }}```:

```yaml
    spec:
      entrypoint: hello-world-example
      templates:
      - name: hello-world-example
        inputs:
          parameters:
          - name: message
        container:
          image: docker.io/library/busybox:latest
          command: 
          - echo
          - {{inputs.parameters.message }}
```

We can then provide a message at runtime as a parameter when we submit the workflow.

## Using the Argo dashboard to submit a workflow


## Using the Argo CLI to submit a workflow

!!! warn "Authentication"

    Since we currently rely on CAS for authentication, we cannot use the Argo CLI to submit a workflow.
    