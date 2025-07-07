import { ChangeEvent } from "react";
import { graphql } from "relay-runtime";
import { useLazyLoadQuery } from "react-relay/hooks";
import { Box, Pagination } from "@mui/material";
import { TemplateCard } from "workflows-lib";
import { TemplatesListQuery } from "./__generated__/TemplatesListQuery.graphql";
import { useClientSidePagination } from "../utils";

const templatesListQuery = graphql`
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

export default function TemplatesList() {
  const data = useLazyLoadQuery<TemplatesListQuery>(templatesListQuery, {});
  const templates = data.workflowTemplates.nodes;

  const {
    pageNumber,
    setPageNumber,
    totalPages,
    paginatedItems: paginatedPosts,
  } = useClientSidePagination(templates, 10);

  const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setPageNumber(page);
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" width="100%">
      {paginatedPosts.map((node, index) => (
        <TemplateCard key={index} template={node} />
      ))}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          mt: 2,
        }}
      >
        <Pagination
          count={totalPages}
          page={pageNumber}
          onChange={handlePageChange}
          showFirstButton
        />
      </Box>
    </Box>
  );
}
