import { graphql } from "react-relay";

export const workflowTemplateFragment = graphql`
  fragment workflowTemplateFragment on WorkflowTemplate {
    name
    maintainer
    title
    description
    arguments
    uiSchema
    repository
  }
`;
