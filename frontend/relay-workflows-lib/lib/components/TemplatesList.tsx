import { ChangeEvent, useMemo, useState } from "react";
import { graphql, useLazyLoadQuery } from "react-relay/hooks";
import {
  Box,
  Pagination,
  Stack,
} from "@mui/material";
import { TemplateCard } from "workflows-lib/lib/components/template/TemplateCard";
import { TemplatesListQuery as TemplatesListQueryType } from "../graphql/__generated__/TemplatesListQuery.graphql";
import { useClientSidePagination } from "../utils";
import TemplateSearchField from "workflows-lib/lib/components/template/TemplateSearchField";
import {
  ScienceGroupSelector,
  WorkflowTemplatesFilter,
} from "workflows-lib";
import { _ } from "ajv";

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
  setFilter,
}: {
  filter?: WorkflowTemplatesFilter;
  setFilter: (filter: WorkflowTemplatesFilter) => void;
}) {
  const data = useLazyLoadQuery<TemplatesListQueryType>(templatesListQuery, {
    filter,
  });
  const [search, setSearch] = useState("");

  const filteredTemplates = useMemo(() => {
    const upperSearch = search.toUpperCase();
    const allTemplates = data.workflowTemplates.nodes;

    if (!search) return allTemplates;

    return allTemplates.filter(
      (template) =>
        template.title?.toUpperCase().includes(upperSearch) ||
        template.name.toUpperCase().includes(upperSearch) ||
        template.description?.toUpperCase().includes(upperSearch),
    );
  }, [search, data]);

  const handleSearch = (search: string) => {
    setSearch(search);
  };

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
