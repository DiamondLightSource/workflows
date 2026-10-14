# Automated Triggering API

## ClusterTriggerTemplate API

### Labels

| Field                              | Description                                                          |
| ---------------------------------- | -------------------------------------------------------------------- |
| `workflows.diamond.ac.uk/source`   | Matches the type of the source - usually `message-bus`               |
| `workflows.diamond.ac.uk/beamline` | Used to prevent conflicts between triggers across multiple beamlines |

### Spec

| Field       | Description                                                                                                       | Default |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| `enabled`   | Boolean value to control whether the Trigger is active                                                            | true    |
| `lifetime`  | How long the Trigger should persist for. Can be specified in seconds (`s`) mins (`m`) or hours (`h`) or `forever` | 24h     |
| `eventName` | This should match an eventName defined in the Workflows platform - usually `<beamline>-message`                   | -       |
| `workflow`  | Configuration for workflow to be ran when the above event is received                                             | -       |

### Workflow

| Field                  | Description                                                                                      | Default |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| `template`             | The `name` of the template that should be run                                                    | -       |
| `triggerOnMessageType` | Which type of document to trigger on - either `'start'` or `'stop'`                              | -       |
| `parameters`           | A list of [parameter](#parameter) objects                                                        | [ ]     |
| `retryBehaviour`       | A [retryBehaviour](#retry-behaviour) object specifying what occurs should workflow creation fail | -       |

### Parameter

At least on one of `path` or `default` must be specified for each parameter.

| Field     | Description                                                                                                                                      | Default |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `name`    | The name of the parameter as it appears in `spec.arguments.parameters` in the Workflow Template                                                  | -       |
| `path`    | The path to the parameter value in the `body` field of the message                                                                               | " "     |
| `default` | The value the parameter will take if the `path` cannot be resolved. Overwrites the default value in the workflow template. This must be a string | -       |

### Retry Behaviour

| Field                 | Description                                                                                                            | Default |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| `numRetries`          | How many times the workflow creation should be reattempted if the first fails. If 0, retries are disabled              | 0       |
| `alertSlackChannelID` | The name or ID of the Slack channel to send a failure alert to if the retries fail. Will not alert if `numRetries = 0` | -       |

## Example ClusterTriggerTemplate:

```yaml
apiVersion: workflows.diamond.ac.uk/v1alpha1
kind: ClusterTriggerTemplate
metadata:
  name: b01-1-trigger-template
  labels:
    workflows.diamond.ac.uk/source: message-bus
    workflows.diamond.ac.uk/beamline: b01-1
spec:
  eventName: b01-1-message
  workflow:
    template: visr-reconstruction
    triggerOnMessageType: stop
    parameters:
      - name: input-file-name
        path: doc.scan_file
      - name: data-collection-dir
        path: doc.data_session_directory
        default: /dls/tmp
    retryBehaviour:
      numRetries: 3
      alertSlackChannelId: C123456789
```
