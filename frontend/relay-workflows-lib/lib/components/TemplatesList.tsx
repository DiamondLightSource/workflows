import { ChangeEvent, useMemo, useState } from "react";
import { graphql } from "relay-runtime";
import { useLazyLoadQuery } from "react-relay/hooks";
import { Box, Pagination } from "@mui/material";
import { TemplateCard } from "workflows-lib";
import { TemplatesListQuery } from "./__generated__/TemplatesListQuery.graphql";
import { useClientSidePagination } from "../utils";
import SearchField from "workflows-lib/lib/components/template/TemplateSearchField"

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
  const [search, setSearch] = useState("")
  const [filteredTemplates, setFilteredTemplates] = useState(data.workflowTemplates.nodes)

  const {
    pageNumber,
    setPageNumber,
    totalPages,
    paginatedItems: paginatedPosts,
  } = useClientSidePagination(filteredTemplates, 10);

  const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setPageNumber(page);
  };

  useMemo(() => {
    const templates = data.workflowTemplates.nodes
    let filteredTemplates = []
    if (search === "") {setFilteredTemplates(templates)}

    const upperSearch = search.toUpperCase()

    for(let i = 0; i < templates.length; i++){
      if(
        templates[i].title?.toUpperCase().includes(upperSearch) ||
        templates[i].name?.toUpperCase().includes(upperSearch) || 
        templates[i].description?.toUpperCase().includes(upperSearch)
      ){
        filteredTemplates.push(templates[i])
      }
    }

    setFilteredTemplates(filteredTemplates)
  }, [search, data])

  return (
    <>
    <SearchField searchSetter={setSearch}/>
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
    </>
  );
}
