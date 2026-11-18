import { gql, TypedDocumentNode } from "@apollo/client";
import {
  SubmitWorfklowTemplateMutation as SubmitWorkflowTemplateMutationType,
  SubmitWorfklowTemplateMutationVariables,
} from "../../types/__generated__/graphql";

export const submitWorkflowTemplateMutation: TypedDocumentNode<
  SubmitWorkflowTemplateMutationType,
  SubmitWorfklowTemplateMutationVariables
> = gql`
  mutation submitWorfklowTemplate(
    $name: String!
    $visit: VisitInput!
    $parameters: JSON!
  ) {
    submitWorkflowTemplate(
      name: $name
      visit: $visit
      parameters: $parameters
    ) {
      id
    }
  }
`;
