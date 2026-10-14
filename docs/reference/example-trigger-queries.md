# Example Trigger Queries

This is a list of example queries and mutations that can be used to interact with automated workflow triggers. To browse the API, use the Documentation Explorer tab on the https://graph.diamond.ac.uk page.

## Mutations

These examples are for visit-agnostic triggers. If a trigger is created [within a specific visit](../explanations/automated-triggers.md#trigger-scope), then that visit will need to be supplied as an argument to all mutations. Mutations will only affect triggers that the token owner created - deleting, disabling or enabling other users' triggers is forbidden.

### Create Trigger from Template

```graphql
mutation {
  createTrigger(templateRef: "example-trigger-template") {
    name
  }
}
```

### Disable Trigger

```graphql
mutation {
  disableTrigger(name: "i15-1-trigger-a1b2c") {
    name
  }
}
```

### Enable Trigger

```graphql
mutation {
  disableTrigger(name: "i15-1-trigger-a1b2c") {
    name
  }
}
```

### Delete Trigger

```graphql
mutation deleteTrigger {
  deleteTrigger(name: "i15-1-trigger-a1b2c") {
    name
  }
}
```

## Queries

### List Multiple Triggers

```graphql
query {
  triggers(limit: 10) {
    nodes {
      name
      beamline
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
  trigger(name: "i15-1-trigger-a1b2c") {
    beamline
    templateRef
    enabled
    creator {
      creatorId
    }
  }
}
```
