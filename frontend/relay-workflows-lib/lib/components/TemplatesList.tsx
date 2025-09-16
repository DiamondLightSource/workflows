import { ChangeEvent, useMemo, useState } from "react";
import { useLazyLoadQuery } from "react-relay/hooks";
import { Box, Pagination } from "@mui/material";
import { TemplateCard } from "workflows-lib/lib/components/template/TemplateCard";
import { templatesListQuery } from "../graphql/TemplatesListQuery";
import { TemplatesListQuery as TemplatesListQueryType } from "../graphql/__generated__/TemplatesListQuery.graphql";
import { useClientSidePagination } from "../utils";
import TemplateSearchField from "workflows-lib/lib/components/template/TemplateSearchField";

export default function TemplatesList() {
  const data = useLazyLoadQuery<TemplatesListQueryType>(templatesListQuery, {});
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
