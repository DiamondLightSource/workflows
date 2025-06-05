import { useLazyLoadQuery } from "react-relay/hooks";
import { TemplatesListQuery } from "./__generated__/TemplatesListQuery.graphql";
import { TemplateCard } from "workflows-lib";
import { graphql } from "relay-runtime";
import { Box } from "@mui/material";

const templatesListQuery = graphql`
  query TemplatesListQuery {
    workflowTemplates {
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
  const data = useLazyLoadQuery<TemplatesListQuery>(templatesListQuery, {});

  return (
    <Box display="flex" flexDirection="column" alignItems="center" width="100%">
      {data.workflowTemplates.nodes.map((node, index) => (
        <TemplateCard key={index} template={node} />
      ))}
    </Box>
  );
}
