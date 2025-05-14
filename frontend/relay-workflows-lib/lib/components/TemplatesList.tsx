import { useLazyLoadQuery } from "react-relay/hooks";
import { TemplatesListQuery } from "./__generated__/TemplatesListQuery.graphql";
import { TemplateCard } from "workflows-lib";
import { graphql } from "relay-runtime";

const templatesListQuery = graphql`
  query TemplatesListQuery($cursor: String, $limit: Int!) {
    workflowTemplates(cursor: $cursor, limit: $limit) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        name
        description
        title
        maintainer
      }
    }
  }
`;

export default function TemplatesList() {
  const data = useLazyLoadQuery<TemplatesListQuery>(templatesListQuery, {
    limit: 10,
    cursor: null,
  });

  return (
    <>
      {data.workflowTemplates.nodes.map((node, index) => {
        return <TemplateCard key={index} template={node} />;
      })}
    </>
  );
}
