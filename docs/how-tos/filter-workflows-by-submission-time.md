# Workflow Submission Time Filtering

## Overview

The `workflows` GraphQL query supports filtering workflows by their submission time using the `submittedTime` filter. This allows clients to retrieve workflows created after, before, or within a specified time range.

The filter uses the workflow's `metadata.creationTimestamp` as its source of truth. It does not use `status.startedAt`, which represents when a workflow started running rather than when it was created.

The GraphQL API remains unchanged. Internally, the lower time bound is passed to the Argo API through the `createdAfter` query parameter, while the upper time bound is evaluated by `graph-proxy`.

## GraphQL Filter

The `submittedTime` filter accepts a `DatetimeOperatorInput` object with two optional fields:

| Field | Description                                                      |
| ----- | ---------------------------------------------------------------- |
| `gt`  | Match workflows created strictly after the specified timestamp.  |
| `lt`  | Match workflows created strictly before the specified timestamp. |

Both fields accept a date/time value. When both are provided, a workflow must satisfy both conditions.

For example, the following filter matches workflows created after 1 January 2026 and before 1 February 2026:

```
filter: {
  submittedTime: {
    gt: "2026-01-01T00:00:00Z"
    lt: "2026-02-01T00:00:00Z"
  }
}
```

Both boundaries are exclusive. A workflow created exactly at either boundary does not match.

## Examples

### 1. Filter workflows submitted after a timestamp

Retrieve workflows created strictly after 1 January 2026 at midnight UTC:

```
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

The `gt` value is passed to the Argo API as the `createdAfter` query parameter. Argo applies this lower-bound filter, so `graph-proxy` does not need to apply the same condition again.

### 2. Filter workflows submitted before a timestamp

Retrieve workflows created strictly before 1 February 2026 at midnight UTC:

```
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

The `lt` value is evaluated by `graph-proxy` against each workflow's `metadata.creationTimestamp`. It is not sent to Argo as a query parameter.

### 3. Filter workflows within a time range

Retrieve workflows created strictly between 1 January and 1 February 2026:

```
query WorkflowsSubmittedWithinRange {
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

For this query:

- Argo applies the lower bound using `createdAfter`.
- `graph-proxy` applies the upper bound by checking `metadata.creationTimestamp`.
- A workflow must satisfy both bounds to be included in the results.

### 4. Combine submission time with other filters

The submission time filter can be combined with existing workflow filters, such as creator, parameters, and annotations.

For example:

```
query FilterWorkflows {
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
      creator: "enu43627"
      parameters: {
        scan_number: "12345"
      }
      annotations: {
        workflows.argoproj.io/pod-name-format: "v2"
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

The `submittedTime.gt` condition is passed to Argo through `createdAfter`. The `submittedTime.lt` condition is evaluated by `graph-proxy`. The remaining filters are applied according to their existing implementations.

## How Filtering Works

The implementation splits submission time filtering between the Argo API and `graph-proxy`.

### Lower bound: `submittedTime.gt`

When `gt` is provided, `graph-proxy` adds the `createdAfter` query parameter to the Argo API request. The timestamp is formatted as RFC 3339.

For example, a lower bound of `2026-01-01T00:00:00Z` is sent in the request as:

```
createdAfter=2026-01-01T00:00:00+00:00
```

Argo uses this parameter to restrict the workflows returned to those created after the specified time.

### Upper bound: `submittedTime.lt`

When `lt` is provided, `graph-proxy` filters the workflows using their `metadata.creationTimestamp`.

A workflow is included only if its creation timestamp is strictly earlier than the specified upper bound. If a workflow has no creation timestamp, it does not match a filter that specifies `submittedTime`.

The upper bound is not sent to Argo as a query parameter.

### When both bounds are provided

When both `gt` and `lt` are set, filtering works as follows:

1. `graph-proxy` passes the lower bound to Argo through `createdAfter`.
2. Argo applies the lower-bound restriction when retrieving workflows.
3. `graph-proxy` evaluates the upper bound against each workflow's creation timestamp.
4. Only workflows satisfying both conditions are included in the results.

## Filtering and Pagination

Argo supports server-side filtering for some workflow attributes, including labels. The submission time filter uses the Argo API's `createdAfter` parameter for its lower bound, while the upper bound is evaluated by `graph-proxy`.

This distinction matters when retrieving paginated results. The upper-bound condition must be applied to the workflows returned by Argo before they are included in the GraphQL results. Because the upper bound is evaluated client-side, workflows returned by Argo may be excluded by `graph-proxy`.

The workflow query's pagination and filtering flow should ensure that the `lt` condition is applied consistently across the relevant Argo pages and that the requested GraphQL pagination semantics are preserved.

## Date and Time Format

Provide timestamps in an RFC 3339-compatible format, preferably with an explicit timezone.

Examples:

```
2026-01-01T00:00:00Z
2026-01-01T10:30:00+01:00
```

Using an explicit timezone avoids ambiguity when comparing workflow creation times.

## Compatibility

The GraphQL filter remains available through `submittedTime`, with the existing `gt` and `lt` fields. The implementation change affects how the filter is applied internally:

- `submittedTime.gt` is passed to the Argo API as `createdAfter`.
- `submittedTime.lt` is evaluated by `graph-proxy` using `metadata.creationTimestamp`.

This preserves the existing GraphQL filter shape for workflow clients. Federated GraphQL schema compatibility, including whether the input type is consistent with existing types such as `DateTimeFilterInput` and `DateTimeFilterInputV2`, should be reviewed separately to check for potential schema conflicts or compatibility issues.

## Summary

The `submittedTime` filter allows workflows to be queried by their creation time using exclusive lower and upper bounds.

- Use `gt` to retrieve workflows created after a timestamp.
- Use `lt` to retrieve workflows created before a timestamp.
- Use both to retrieve workflows within a time range.
- The lower bound is applied by Argo through `createdAfter`.
- The upper bound is applied by `graph-proxy` using `metadata.creationTimestamp`.
- Submission time filtering can be combined with other workflow filters.