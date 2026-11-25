import { gql, TypedDocumentNode } from "@apollo/client";
import { GetTemplatesQuery } from "../../types/__generated__/graphql";

export const templatesOverviewQuery: TypedDocumentNode<GetTemplatesQuery> = gql`
  query getTemplates {
    workflowTemplates {
      nodes {
        name
        maintainer
        title
        description
      }
    }
  }
`;
