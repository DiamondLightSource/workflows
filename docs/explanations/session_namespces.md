# Session Namespaces

Each Diamond session or visit is provisioned a namespace in the Workflows cluster.
This provides a shared administrative domain, allowing any user on the session to observe and manage workflows.
Each session namespace is given a [Config Map](#config-map) with information about the visit, [Service Accounts](#service-accounts) to manage permissions and a [Secret](#secret) to afford access to the Artifact Store.

# Config Map

A [Config Map](https://kubernetes.io/docs/concepts/configuration/configmap/) named `sessionspaces` is created in each namespace.
It contains various details of the session, including:

- `proposal_code` - the two letter proposal code, e.g. `cm`
- `proposal_number` - the unique number attributed to the proposal, e.g. `37235`
- `visit` - the unique, incrementing, number of the session within the proposal, e.g. `2`
- `instrument` - the name of the instrument on which this session took place, e.g. `i03`
- `start_date` - the date and time at which this session was scheduled to begin, e.g. `2024-03-15 9:00:00.0`
- `end_date` - the date and time at which this session was scheduled to finish, e.g. `2024-05-24 9:00:00.0`
- `data_directory` - the root directory of the visit, e.g. `/dls/i03/data/2024/cm37235-2/`
- `gid` - the Group ID of the Unix group associated with this session, e.g. `159620`
- `members` - a JSON list of the users who are permitted to access this visit, e.g. `["enu43627", "iat69393", "mrg27357"]`

!!! warning "Config Map Strings"

    Kubernetes Config Maps store all data as strings, therefore any numerical values may need to be parsed for use in templates

# Service Accounts

Two [Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/) are created in each namespace - the `visit-member` Service Account which allows Argo Workflows users to manage workflows, and the `argo-workflow` Service Account which is used to run workflow pods. This is in addition to the existing 'default' account which is given no permissions.

# Secret

A [Secret](https://kubernetes.io/docs/concepts/configuration/secret/) named `artifact-s3` is cloned into each namespace.
This allows workflows and users access to the Artifact store, where workflow logs and output [Artifacts](https://argo-workflows.readthedocs.io/en/stable/walk-through/artifacts/) are stored.

