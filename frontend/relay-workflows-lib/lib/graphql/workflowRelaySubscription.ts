import { graphql, GraphQLTaggedNode } from "react-relay";

export const workflowRelaySubscription: GraphQLTaggedNode = graphql`
  subscription workflowRelaySubscription($visit: VisitInput!, $name: String!) {
    workflow(visit: $visit, name: $name) {
      name
      visit {
        proposalCode
        proposalNumber
        number
      }
      templateRef
      parameters
      status {
        __typename
        ... on WorkflowPendingStatus {
          message
        }
        ... on WorkflowRunningStatus {
          startTime
          message
          tasks {
            id
            name
            status
            depends
            dependencies
            stepType
            artifacts {
              name
              url
              mimeType
            }
          }
        }
        ... on WorkflowSucceededStatus {
          startTime
          endTime
          message
          tasks {
            id
            name
            status
            depends
            dependencies
            stepType
            artifacts {
              name
              url
              mimeType
            }
          }
        }
        ... on WorkflowFailedStatus {
          startTime
          endTime
          message
          tasks {
            id
            name
            status
            depends
            dependencies
            stepType
            artifacts {
              name
              url
              mimeType
            }
          }
        }
        ... on WorkflowErroredStatus {
          startTime
          endTime
          message
          tasks {
            id
            name
            status
            depends
            dependencies
            stepType
            artifacts {
              name
              url
              mimeType
            }
          }
        }
      }
    }
  }
`;
