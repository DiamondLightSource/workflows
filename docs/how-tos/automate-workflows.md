# Setting up Automated Workflows

Before automated processing can be set up, the beamline needs to be set up as a source. This must be done by the Workflows team - contact us on Slack at [#workflows](https://diamondlightsource.slack.com/archives/C08NYJSGMFD). Currently supported beamlines:

- b01-1
- i15-1

Once a beamline is supported as a source of events, it can be used in ClusterTriggerTemplates.

## ClusterTriggerTemplates:

The mapping of the message to a workflow is done via triggers, which in turn are created from templates. A template is formatted as shown below. See [the API](../reference/trigger-template-api.md) for reference.

??? example "Trigger template"
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
        lifetime: 72h
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

### Anatomy of a ClusterTriggerTemplate

#### Labels

```yaml
labels:
  workflows.diamond.ac.uk/source: message-bus
  workflows.diamond.ac.uk/beamline: p99
```

These labels are required to help match the trigger to the source. Currently, `message-bus` is the only supported type of source. See the top of this page for a list of valid `beamline`s.

#### Event Name

```yaml
eventName: p99-message
```

The `eventName` field, like the labels, matches the trigger to a beamline event. The value of eventName will usually take the value `<beamline>-message`. If another value is necessary (if multiple message queues are used for triggering on the same beamline, for instance) then the Workflows team will make this clear when setting up the beamline as a source.

#### Lifetime

```yaml
lifetime: 72h
```

A trigger will be automatically deleted after lifetime is expended. See an [explanation of lifetime](../explanations/automated-triggers.md#trigger-lifetime).

#### Workflow

```yaml
workflow:
  template: example-template
  triggerOnMessageType: stop
```

The `workflow` field contains information about what should run when a message is received. The `template` should match the `metadata.name` of a workflow template in the [template list](https://workflows.diamond.ac.uk/templates). `triggerOnMessageType` allows workflows to be triggered from either `start` or `stop` documents.

#### Workflow Parameters

```yaml
parameters:
  - name: input-file-name
    path: doc.scan_file
    default: "00001"
```

`parameters` is a list of mappings between the message and the workflow arguments. `name` should match the name of a parameter defined under `spec.arguments.parameters` of the workflow template previously specified. The `path` refers to a field in the body of the message from which the value of the argument will be taken. A `default` value may be specified.

#### Workflow Retry Behaviour

```yaml
retryBehaviour:
  numRetries: 2
  alertSlackChannelId: C123456789
```

The retry behaviour dictates what should happen in the event that a workflow cannot be created on the cluster when a trigger fires. By default, a failed workflow will not be retried, so as to prevent race conditions between indentical workflows. Setting `numRetries` to a value other than 0 will override this behaviour.

A Slack alert can also be configured to go to the channel specified by `alertSlackChannelId`. This will fire if the retries _also_ fail. Due to technical limitations, `numRetries` must be non-zero for these alerts to work. The alerts also require the Analysis Platform Alerts app to be invited to the channel.

## Creating a Trigger from a Template

Once a ClusterTriggerTemplate has been written it must be pushed to a repository that is tracked by the Workflows platform. If using a new repository - or a new directory within a tracked repository - then it will be necessary to contact the [#workflows](https://diamondlightsource.slack.com/archives/C08NYJSGMFD) team to get the new location tracked.

After the template is tracked, it can be used to create a trigger in two ways:

### CLI

Using the Workflows CLI tools, a trigger can be created like so:

```sh
module load workflows
workflows trigger-create <TEMPLATE NAME>
```

The session can be set using the `--session` or `-s` flag, while a custom name can be provided with the `--name` or `-n` flag:

```sh
workflows trigger-create -s cm12345 example-trigger-template -n trigger-foo
```

### Graph Mutation

Triggers can also be instantiated with a Graph mutation to https://graph.diamond.ac.uk/:

```graphql
mutation {
  createTrigger(templateRef: "example-trigger-template") {
    name
  }
}
```

Browse the [example trigger queries](../reference/example-trigger-queries.md) for more ways to interact with triggers via the Graph.
