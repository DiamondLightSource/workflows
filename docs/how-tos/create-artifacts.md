# Creating Artifacts

## Preface

This guide will describe how to create artifacts and export them at the end of a workflow run. These artifacts are then made available on the [dashboard](https://workflows.diamond.ac.uk/workflows) where they can be downloaded.

## The Workflow

We start with a basic workflow - this is taken from the [writeable containers example](/how-tos/create-writeable-container) . This is a basic workflow that uses a busybox image to execute some arbitrary bash command - where the bash is defined by a parameter - `command`.
This workflow also has a local-volume mounted to it to store some files in.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: mount-tmpdir
spec:
  entrypoint: workflow-entry
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
  - name: bash
    inputs:
      parameters:
      - name: command
    container:
      image: busybox
      volumeMounts:
      - name: tmpdir
        mountPath: /tmp
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
              echo "This is my message!" > /tmp/some-text.txt
              cat /tmp/some-text.txt
```

## Modifying the Template

We must modify the workflow template for it to create an artifact. Add the `output` tag with the name and path of the expected artifact.

```yaml
  - name: bash
    inputs:
      parameters:
      - name: command
    container:
      image: busybox
      volumeMounts:
      - name: tmpdir
        mountPath: /tmp
      command: ["/bin/sh", "-c"]
      args: - "{{ inputs.parameters.command }}"
    outputs:
      artifacts:
      - name: text
        path: /tmp/some-text.txt
        archive:
          none: { }
```

By default, all artifact are tarballs. This can be disabled by adding `none` to the archive, meaning artifact are saved as their raw type. Supported artifact types will be available for preview on the dashboard, but tarballs will have to be downloaded to view their content so we suggest not archiving small artifacts - such as images and text files.
The complete workflow is provided below for reference.


!!! example

    See the full manifest below
    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      generateName: mount-tmpdir-
    spec:
      entrypoint: workflow-entry
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
      - name: bash
        inputs:
          parameters:
          - name: command
        container:
          image: busybox
          volumeMounts:
          - name: tmpdir
            mountPath: /tmp
          command: ["/bin/sh", "-c"]
          args:
          - "{{ inputs.parameters.command }}"
        outputs:
          artifacts:
          - name: text
            path: /tmp/some-text.txt
            archive:
              none: { }

      - name: workflow-entry
        dag:
          tasks:
          - name: say-hello
            template: bash
            arguments:
              parameters:
              - name: command
                value: |
                  echo "This is my message!" > /tmp/some-text.txt
                  cat /tmp/some-text.txt
    ```

## Templating The Path

In the above example we have written the path straight into the workflow, but the path is also template-able. 
We cannot template the path in the above example, as the command parameter is defined at the top level of parameters.
Below is a similar example where the path has been templated.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: sample-artifact-
spec:
  entrypoint: workflow-entry
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
  - name: bash
    inputs:
      parameters:
      - name: name 
      - name: output_path
    container:
      image: busybox
      volumeMounts:
      - name: tmpdir
        mountPath: /tmp
      command: ["/bin/sh", "-c"]
      args:
      - echo Hello {{ inputs.parameters.name }} > {{ inputs.parameters.output_path }}
    outputs:
      artifacts:
      - name: text
        path: "{{  inputs.parameters.output_path }}"
        archive:
          none: { }

  - name: workflow-entry
    dag:
      tasks:
      - name: say-hello
        template: bash
        arguments:
          parameters: 
          - name: name
            value: YOUR NAME
          - name: output_path
            value: "/tmp/my-file.txt"
```