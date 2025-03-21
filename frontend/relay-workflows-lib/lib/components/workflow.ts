import { graphql } from "react-relay";

export const workflowFragment = graphql`
  fragment workflowFragment on Workflow {
    name
    visit {
      proposalCode
      proposalNumber
      number
    }
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
          artifacts {
            name
            url
            mimeType
          }
        }
      }
    }
  }
`;
