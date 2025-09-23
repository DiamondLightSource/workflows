import { ChangeEvent, useMemo, useState } from "react";
import TemplateCard from "../components/TemplateCard";
import { graphql, useLazyLoadQuery, useFragment } from "react-relay/hooks";
import { Box, Pagination } from "@mui/material";
import type { TemplatesListViewQuery_templateSearch$key } from "./__generated__/TemplatesListViewQuery_templateSearch.graphql";
import { useClientSidePagination } from "../utils/coreUtils";
import TemplateSearchField from "workflows-lib/lib/components/template/TemplateSearchField";
import { TemplatesListViewQuery as TemplatesListViewQueryType } from "./__generated__/TemplatesListViewQuery.graphql";

const templateSearchFragment = graphql`
  fragment TemplatesListViewQuery_templateSearch on WorkflowTemplate {
    name
    title
    description
  }
`;

export const TemplatesListViewQuery = graphql`
  query TemplatesListViewQuery {
    workflowTemplates {
      nodes {
        ...TemplateCard_template
        ...TemplatesListViewQuery_templateSearch
      }
    }
  }
`;

export default function TemplatesListView() {
  const data = useLazyLoadQuery<TemplatesListViewQueryType>(
    TemplatesListViewQuery,
    {},
  );
  const [search, setSearch] = useState("");

  const templatesWithSearchData = data.workflowTemplates.nodes.map(
    (template) =>
      template
        ? {
            original: template,
            searchData: useFragment(
              templateSearchFragment,
              template as TemplatesListViewQuery_templateSearch$key,
            ),
          }
        : null,
  );

  const filteredTemplates = useMemo(() => {
    const upperSearch = search.toUpperCase();
    if (!search)
      return templatesWithSearchData.map((t) => t?.original).filter(Boolean);

    return templatesWithSearchData
      .filter((t) => {
        if (!t) return false;
        const { searchData } = t;
        return (
          searchData.title?.toUpperCase().includes(upperSearch) ||
          searchData.name.toUpperCase().includes(upperSearch) ||
          searchData.description?.toUpperCase().includes(upperSearch)
        );
      })
      .map((t) => t?.original);
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
        {paginatedPosts.map((template, i) =>
          template ? <TemplateCard key={i} template={template} /> : null,
        )}
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
