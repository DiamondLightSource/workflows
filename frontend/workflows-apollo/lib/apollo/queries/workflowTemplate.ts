import { gql, TypedDocumentNode } from "@apollo/client";
import {
  WorkflowTemplateQuery as WorkflowTemplateQueryType,
  WorkflowTemplateQueryVariables,
} from "../../types/__generated__/graphql";

export const workflowTemplateQuery: TypedDocumentNode<
  WorkflowTemplateQueryType,
  WorkflowTemplateQueryVariables
> = gql`
  query workflowTemplate($name: String!) {
    workflowTemplate(name: $name) {
      name
      title
      description
      maintainer
      arguments
      uiSchema
      templateSource {
        repositoryUrl
        path
        targetRevision
      }
    }
  }
`;
