# Writing to the Container File System

## Preface

This guide will describe how to mount a temporary writable volume to the container to write transient files to, and to import/export artifacts in.

## Workflow

A basic workflow is described below. This workflow will spin up a single pod, execute some arbitrary bash, and then exit.

``` yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: exec-bash
spec:
  entrypoint: workflow-entry
  templates:
  - name: bash
    inputs:
      parameters:
      - name: command
    container:
      image: busybox
      command: ["/bin/sh", "-c"]
      args:
        - "{{ inputs.parameters.command }}"

  - name: workflow-entry
    dag:
      tasks:
      - name: say-hello
        template: bash
        arguments:
          parameters:
            - name: command
              value: |
                echo "Hello world!" 
```

In its current state, the container is unable to write to its own filesystem. To enable this, we must mount a temporary volume to the container. This requires two things. A volume claim, and a volume mount. For a temporarty volume, we add the following below the entrypoint. This provides 1Gb of temporarty storage to use in this pod, and further pods, which we mount to whatever path is described in the container.

Now we have a writable volume, we can write something to it, so we can pipe the echo into a file, and read it back out!

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: exec-bash
spec:
  entrypoint: workflow-entry
  #vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
  volumeClaimTemplates:
  - metadata:
      name: tmpdir
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
      storageClassName: local-path
  #^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  templates:
  - name: bash
    inputs:
      parameters:
      - name: command
    container:
      image: busybox
  #vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
      volumeMounts:
      - name: tmpdir
        mountPath: /tmp
  #^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      command: ["/bin/sh", "-c"]
      args:
      - "{{ inputs.parameters.command }}"

  - name: workflow-entry
    dag:
      tasks:
      - name: say-hello
        template: bash
        arguments:
          parameters: 
          - name: command
            value: |
              echo "This is my message!" > /tmp/my-file.txt
              cat /tmp/my-file.txt
```

## Sharing Files

The mounted volume will be shared throughout a workflow run, so multiple steps can share files through `/tmp`.

Adding the task as below to the worklfow will read the file written in the previous step, and output the content.

```yaml
      - name: read-shared-file
        dependencies: [say-hello]
        template: bash
        arguments:
          parameters:
          - name: command
            value: |
              cat /tmp/my-file.txt
```
