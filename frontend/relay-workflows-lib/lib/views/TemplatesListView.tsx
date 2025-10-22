import { useState, ChangeEvent, useMemo, useEffect } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { Box, Pagination, Stack } from "@mui/material";
import { useClientSidePagination } from "../utils/coreUtils";
import TemplateSearchField from "workflows-lib/lib/components/template/TemplateSearchField";
import type { TemplatesListViewQuery as TemplatesListViewQueryType } from "relay-workflows-lib/lib/views/__generated__/TemplatesListViewQuery.graphql";
import { TemplateCard } from "relay-workflows-lib/lib/components/TemplateCard";
import { templateMatchesSearch } from "../utils/useTemplateMatchesSearch";
import { ScienceGroupSelector, WorkflowTemplatesFilter } from "workflows-lib";

export const TemplatesListViewQuery = graphql`
  query TemplatesListViewQuery($filter: WorkflowTemplatesFilter) {
    workflowTemplates(filter: $filter) {
      nodes {
        name
        title
        description
        ...TemplateCardFragment
      }
    }
  }
`;

export default function TemplatesListView({
  filter,
  setFilter,
}: {
  filter?: WorkflowTemplatesFilter;
  setFilter: (filter: WorkflowTemplatesFilter) => void;
}) {
  const data = useLazyLoadQuery<TemplatesListViewQueryType>(
    TemplatesListViewQuery,
    { filter },
  );
  const [search, setSearch] = useState("");

  const filteredNodes = useMemo(() => {
    const result = data.workflowTemplates.nodes.filter((node) => {
      const match = templateMatchesSearch(
        search,
        node.name,
        node.title ?? "",
        node.description,
      );
      return match;
    });
    return result;
  }, [search, data.workflowTemplates.nodes]);

  const { pageNumber, setPageNumber, totalPages, paginatedItems } =
    useClientSidePagination(filteredNodes, 10);

  useEffect(() => {
    setPageNumber(1);
  }, [search, setPageNumber]);

  const handleSearch = (search: string) => {
    setSearch(search);
  };

  const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setPageNumber(page);
  };

  return (
    <>
      <Stack direction="row" spacing={1}>
        <TemplateSearchField handleSearch={handleSearch} />
        <ScienceGroupSelector setFilter={setFilter} />
      </Stack>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        width="100%"
      >
        {paginatedItems.map((template, i) => (
          <TemplateCard key={i} template={template} />
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
