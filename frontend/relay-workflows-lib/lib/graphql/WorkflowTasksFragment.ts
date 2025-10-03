import { graphql } from "react-relay";

export const WorkflowTasksFragment = graphql`
  fragment WorkflowTasksFragment on Workflow {
    name
    visit {
      proposalCode
      proposalNumber
      number
    }
    status {
      __typename
      ... on WorkflowRunningStatus {
        tasks {
          id
          name
          status
          depends
          stepType
          artifacts {
            name
            url
            mimeType
          }
        }
      }
      ... on WorkflowSucceededStatus {
        tasks {
          id
          name
          status
          depends
          stepType
          artifacts {
            name
            url
            mimeType
          }
        }
      }
      ... on WorkflowFailedStatus {
        tasks {
          id
          name
          status
          depends
          stepType
          artifacts {
            name
            url
            mimeType
          }
        }
      }
      ... on WorkflowErroredStatus {
        tasks {
          id
          name
          status
          depends
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
`;
