import { graphql } from "relay-runtime";

export const workflowsQuery = graphql`
  query workflowsQuery(
    $visit: VisitInput!
    $cursor: String
    $limit: Int!
    $filter: WorkflowFilter
  ) {
    workflows(visit: $visit, cursor: $cursor, limit: $limit, filter: $filter) {
      nodes {
        name
      }
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
        startCursor
      }
    }
  }
`;
