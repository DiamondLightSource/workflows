import { graphql } from "relay-runtime";

export const MockRenderSubmittedMessageQuery = graphql`
  query MockRenderSubmittedMessageQuery($visit: VisitInput!, $name: String!) {
    workflow(visit: $visit, name: $name) {
      ...RenderSubmittedMessageFragment
    }
  }
`;
