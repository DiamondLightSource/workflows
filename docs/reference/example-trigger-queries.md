# Example Trigger Queries

This is a list of example queries and mutations that can be used to interact with automated workflow triggers. To browse the API, use the Documentation Explorer tab on the https://graph.diamond.ac.uk page.

## Mutations

Each trigger mutation takes a single `input` argument and returns a payload containing the result and a list of `errors`.

These examples are for visit-agnostic triggers. If a trigger is created [within a specific visit](../explanations/automated-triggers.md#trigger-scope), then that visit must be supplied as the `session` in every mutation that refers to it, for example `reference: { name: "i15-1-trigger-a1b2c", session: { proposalCode: "cm", proposalNumber: 12345, number: 1 } }`. Mutations only affect triggers that the token owner created: updating, deleting, disabling or enabling other users' triggers is forbidden.

### Create Trigger from Template

```graphql
mutation {
  createWorkflowTrigger(input: { templateRef: "example-trigger-template" }) {
    workflowTrigger {
      name
    }
    errors {
      code
      message
    }
  }
}
```

A name is generated from the template name unless one is provided with `name`. Provide `session` to create the trigger within a specific visit:

```graphql
mutation {
  createWorkflowTrigger(
    input: {
      templateRef: "example-trigger-template"
      name: "trigger-foo"
      session: { proposalCode: "cm", proposalNumber: 12345, number: 1 }
    }
  ) {
    workflowTrigger {
      name
      session
    }
    errors {
      code
      message
    }
  }
}
```

### Update Trigger

Changes the ClusterTriggerTemplate a trigger is based on. Fields that are omitted keep their current values; at least one field to update must be provided.

```graphql
mutation {
  updateWorkflowTrigger(
    input: {
      reference: { name: "i15-1-trigger-a1b2c" }
      templateRef: "example-trigger-template-v2"
    }
  ) {
    workflowTrigger {
      name
      templateRef
    }
    errors {
      code
      message
    }
  }
}
```

### Disable Trigger

```graphql
mutation {
  disableWorkflowTrigger(input: { reference: { name: "i15-1-trigger-a1b2c" } }) {
    workflowTrigger {
      name
      enabled
    }
    errors {
      code
      message
    }
  }
}
```

### Enable Trigger

```graphql
mutation {
  enableWorkflowTrigger(input: { reference: { name: "i15-1-trigger-a1b2c" } }) {
    workflowTrigger {
      name
      enabled
    }
    errors {
      code
      message
    }
  }
}
```

### Delete Trigger

```graphql
mutation {
  deleteWorkflowTrigger(input: { reference: { name: "i15-1-trigger-a1b2c" } }) {
    deletedWorkflowTriggerName
    errors {
      code
      message
    }
  }
}
```

## Queries

### List Multiple Triggers

```graphql
query {
  workflowTriggers(limit: 10) {
    nodes {
      name
      beamline
      session
      templateRef
      enabled
      creator {
        creatorId
      }
    }
  }
}
```

### Get Specific Trigger

```graphql
query {
  workflowTrigger(reference: { name: "i15-1-trigger-a1b2c" }) {
    beamline
    templateRef
    enabled
    creator {
      creatorId
    }
  }
}
```
