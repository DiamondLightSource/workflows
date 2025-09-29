import { ChangeEvent, useMemo, useState } from "react";
import { useLazyLoadQuery } from "react-relay/hooks";
import { Box, Pagination } from "@mui/material";
import { TemplateCard, WorkflowTemplatesFilter } from "workflows-lib";
import { TemplatesListQuery } from "./__generated__/TemplatesListQuery.graphql";
import { useClientSidePagination } from "../utils";

const templatesListQuery = graphql`
  query TemplatesListQuery($filter: WorkflowTemplatesFilter) {
    workflowTemplates(filter: $filter) {
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

export default function TemplatesList({
  filter,
}: {
  filter: WorkflowTemplatesFilter;
}) {
  const data = useLazyLoadQuery<TemplatesListQuery>(templatesListQuery, {
    filter,
  });

  const templates = data.workflowTemplates.nodes;

  const {
    pageNumber,
    setPageNumber,
    totalPages,
    paginatedItems: paginatedPosts,
  } = useClientSidePagination(filteredTemplates, 10);

  const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setPageNumber(page);
  };

  return (
    <>
      <TemplateSearchField handleSearch={handleSearch} />
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        width="100%"
      >
        {paginatedPosts.map((template) => (
          <TemplateCard key={template.name} template={template} />
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
    </>
  );
}
