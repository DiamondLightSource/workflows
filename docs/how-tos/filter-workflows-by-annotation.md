# Filter workflows by annotation

You can filter workflows using Kubernetes annotations through the GraphQL `workflows` query.

## Before you start

You need access to the Workflows GraphQL API and a visit containing the workflows you want to search.

## Filter by an annotation

Add an `annotations` filter to the `filter` argument of the `workflows` query.

For example, the following query finds workflows with the annotation `workflows.argoproj.io/pod-name-format` set to `v1`:

```graphql
query {
  workflows(
    visit: {
      proposalCode: "ks"
      proposalNumber: 10000
      number: 1
    }
    filter: {
      annotations: [
        {
          key: "workflows.argoproj.io/pod-name-format"
          value: "v1"
        }
      ]
    }
    limit: 10
  ) {
    nodes {
      id
      name
    }
  }
}
```

The `key` is the annotation name and `value` is the exact value to match.

For example:

```text
workflows.argoproj.io/pod-name-format = v1
```

Only workflows with that exact annotation key and value are returned.

## Filter using multiple annotations

You can provide more than one annotation filter:

```graphql
filter: {
  annotations: [
    {
      key: "workflows.argoproj.io/pod-name-format"
      value: "v1"
    }
    {
      key: "example.com/environment"
      value: "production"
    }
  ]
}
```

A workflow must match **all** annotation filters to be returned.

## Annotation filtering and pagination

Annotation filtering is performed by the Workflows GraphQL service rather than by the Argo Workflows API. The Argo API does not provide filtering for arbitrary workflow annotations through its existing `listOptions` filters.

The GraphQL service therefore retrieves workflows from Argo and applies the annotation filters before returning the results.

Because of this, a query may need to retrieve multiple pages of workflows from Argo before enough matching workflows are found.

For this reason, using a specific annotation key and value is recommended when filtering workflows.
