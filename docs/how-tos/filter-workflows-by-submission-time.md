# Workflow Submission Time Filtering

## Overview

The GraphQL `workflows` query supports filtering workflows by their submission date and time using the `submittedTime` field in `WorkflowFilter`.

This allows clients to retrieve workflows submitted after a specified timestamp, before a timestamp, or within a date/time range.

Submission-time filtering works alongside existing workflow filters, including status, creator, template, labels, parameters, and annotations.

## GraphQL API

The `submittedTime` field accepts a `DatetimeOperatorInput`:

```graphql
input DatetimeOperatorInput {
  gt: DateTime
  lt: DateTime
}
```

* `gt`: Matches workflows whose submission timestamp is strictly greater than the specified timestamp.
* `lt`: Matches workflows whose submission timestamp is strictly less than the specified timestamp.

Either operator can be used independently, or both can be combined to define a range.

## Examples

### 1. Filter workflows submitted after a timestamp

Retrieve workflows submitted after 1 January 2026 at midnight UTC:

```graphql
query WorkflowsSubmittedAfter {
  workflows(
    visit: {
      proposalCode: "mg"
      proposalNumber: 36964
      number: 1
    }
    filter: {
      submittedTime: {
        gt: "2026-01-01T00:00:00Z"
      }
    }
  ) {
    nodes {
      id
      name
    }
  }
}
```

The timestamp boundary is exclusive. Workflows created exactly at `2026-01-01T00:00:00Z` do not match.

### 2. Filter workflows submitted before a timestamp

Retrieve workflows submitted before 1 February 2026 at midnight UTC:

```graphql
query WorkflowsSubmittedBefore {
  workflows(
    visit: {
      proposalCode: "mg"
      proposalNumber: 36964
      number: 1
    }
    filter: {
      submittedTime: {
        lt: "2026-02-01T00:00:00Z"
      }
    }
  ) {
    nodes {
      id
      name
    }
  }
}
```

Workflows created exactly at the specified boundary are excluded.

### 3. Filter workflows within a date/time range

To retrieve workflows submitted during January 2026:

```graphql
query WorkflowsSubmittedInRange {
  workflows(
    visit: {
      proposalCode: "mg"
      proposalNumber: 36964
      number: 1
    }
    filter: {
      submittedTime: {
        gt: "2026-01-01T00:00:00Z"
        lt: "2026-02-01T00:00:00Z"
      }
    }
  ) {
    nodes {
      id
      name
    }
  }
}
```

Both conditions must be satisfied. The effective range is:

```text
2026-01-01T00:00:00Z < submission time < 2026-02-01T00:00:00Z
```

Therefore, timestamps exactly on either boundary are excluded.

## Combining with Existing Filters

`submittedTime` can be combined with other fields in `WorkflowFilter`. All supplied filters must match for a workflow to be returned.

For example, filter by creator, parameter, annotation, and submission range:

```graphql
query FilterWorkflowsBySubmissionAndMetadata {
  workflows(
    visit: {
      proposalCode: "mg"
      proposalNumber: 36964
      number: 1
    }
    filter: {
      creator: "enu43627"
      parameters: [
        {
          parameterName: "scan_number"
          value: "12345"
        }
      ]
      annotations: [
        {
          key: "workflows.argoproj.io/pod-name-format"
          value: "v2"
        }
      ]
      submittedTime: {
        gt: "2026-01-01T00:00:00Z"
        lt: "2026-02-01T00:00:00Z"
      }
    }
  ) {
    nodes {
      id
      name
      parameters
    }
  }
}
```

Replace the example values with values present on workflows in your environment.

## Timestamp Source

Submission time is evaluated using the Kubernetes Workflow resource's:

```text
metadata.creationTimestamp
```

This is the resource creation timestamp, rather than the workflow execution start time (`status.startedAt`).

Workflows without a creation timestamp do not match when a `submittedTime` filter is supplied.

## Timezone and Date/Time Format

Timestamps should be provided as valid GraphQL `DateTime` values using an RFC 3339-compatible format, with an explicit timezone.

UTC is recommended. For example:

```text
2026-01-01T00:00:00Z
```

A timestamp with an explicit offset can also be used where accepted by the GraphQL `DateTime` scalar, for example:

```text
2026-01-01T01:00:00+01:00
```

These two values represent the same instant.

Avoid timestamps without a timezone because their intended interpretation may be ambiguous.

## Filtering and Pagination

The workflow API supports filtering through Argo's label selector for fields such as status, creator, template, and labels. Argo does not provide equivalent label-selector filtering for parameters, annotations, or creation timestamps.

Consequently, `submittedTime` uses the existing client-side filtering path, alongside parameter and annotation filtering.

The workflow query applies these filters before returning the requested GraphQL page. It can fetch additional Argo pages to collect enough matching workflows for the requested page and determine whether another matching page exists.

This preserves the existing pagination approach while allowing submission-time filtering to be combined with other filters.

## Error Handling and Compatibility

* **Invalid timestamp:** A value that cannot be parsed by the GraphQL `DateTime` scalar should produce a GraphQL input validation error.
* **No matches:** A valid filter that matches no workflows returns an empty result connection.
* **Existing queries:** Queries that omit `submittedTime` retain their existing filtering behaviour.
* **Combined filters:** Every supplied filter must match; adding `submittedTime` narrows the results returned by the other filters.

## Summary

The `submittedTime` filter provides exclusive lower (`gt`) and upper (`lt`) timestamp bounds for GraphQL workflow searches. It uses `metadata.creationTimestamp`, supports one-sided and range-based queries, composes with existing filters, and applies filtering before pagination.
