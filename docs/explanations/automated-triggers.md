# Automated Triggering

For some repetitive analysis jobs, it is impractical to run workflows manually and impossible to script without suppying fresh authentication tokens regularly. The Workflows platform supports running workflows automatically from messages that are available over a RabbitMQ message bus.

There are three main components that are required to set up an automated workflow pipeline:

1. The **source** - this is configuration that the Workflows team sets up inside the platform to connect to the relevant message bus;
1. The **trigger template** - this a resource that is created and managed by the user. It defines how a message on the message bus gets converted to a workflow. By itself, a template will not result in any automated processing. Instead, it is used for spawning instances of...
1. The **trigger** - a trigger is created on the workflows cluster from a trigger template template, just like how workflows are created from a workflow template. It is the presence of a trigger in the cluster that enables the automated triggering to function.

For information on creating trigger templates and triggers, see [the automated workflows guide](../how-tos/automate-workflows.md).

### Trigger Scope

When creating a trigger from a template, a visit may be specified. If so, then the trigger will only match messages for which the `body.doc.instrument_session` field matches the trigger's visit and thus can only start workflows in that visit. If no visit is provided when setting up the trigger then it will fire for all messages on the message bus, regardless of session ID.

### Trigger Expiration

By default, a trigger will last for 24 hours before being deleted. This can be changed by providing a value for `spec.lifetime` in the trigger template `s` (seconds), `m` (minutes) and `h` (hours) are valid units for this field. Using a `lifetime` of `forever` will create a trigger that is not automatically deleted.

### Auth in Automated Workflows

For the purposes of accessing the file system, workflows that are created via an automated trigger will run with the same groups and permissions as the account whose token is used to create that instance of the trigger. Typically, this will be whomever ran the `createTrigger` mutation.

Triggers can run as a service account, but that account requires:

1. Addition to the `workflows-machines` group by the Cloud team,
1. A POSIX UID,
1. The usual permissions described in the [authentication guide](../how-tos/authentication.md#developer-instructions.md)
