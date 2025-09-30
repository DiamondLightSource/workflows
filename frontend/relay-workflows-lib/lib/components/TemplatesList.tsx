import { ChangeEvent, useMemo, useState } from "react";
import { graphql, useLazyLoadQuery } from "react-relay/hooks";
import { Box, Button, Pagination, Stack } from "@mui/material";
import { TemplateCard, WorkflowTemplatesFilter } from "workflows-lib";
import { TemplatesListQuery } from "./__generated__/TemplatesListQuery.graphql";
import { useClientSidePagination } from "../utils";
import TemplateSearchField from "workflows-lib/lib/components/template/TemplateSearchField";

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
  const [search, setSearch] = useState<string>("");

  const filteredTemplates = useMemo(() => {
    const upperSearch = search.toUpperCase();
    const allTemplates = data.workflowTemplates.nodes;

    if (!search) return allTemplates;

    return allTemplates.filter(
      (template) =>
        template.title?.toUpperCase().includes(upperSearch) ||
        template.name.toUpperCase().includes(upperSearch) ||
        template.description?.toUpperCase().includes(upperSearch)
    );
  }, [search, data]);

  const {
    pageNumber,
    setPageNumber,
    totalPages,
    paginatedItems: paginatedPosts,
  } = useClientSidePagination(filteredTemplates, 10);

  const handleSearch = (search: string) => {
    setSearch(search);
  };

  const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setPageNumber(page);
  };

  return (
    <>
      <Stack direction="row" spacing={4} alignItems="flex-start">
        <TemplateSearchField handleSearch={handleSearch} />
        <Button>Hello</Button>
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
