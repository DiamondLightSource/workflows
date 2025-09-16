import { graphql } from "relay-runtime";

export const templatesListQuery = graphql`
  query TemplatesListQuery {
    workflowTemplates {
      nodes {
        name
        description
        title
        maintainer
        repository
      }
    }
  }
`;
