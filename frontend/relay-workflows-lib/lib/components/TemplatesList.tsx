import { ChangeEvent, useEffect, useState } from "react";
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

  const filterTemplates = () => {
    let templates = data.workflowTemplates.nodes
    let filteredTemplates = []
    if (search === "") {return templates}

    for(let i = 0; i < templates.length; i++){
      if(
        templates[i].title?.includes(search) ||
        templates[i].name?.includes(search) || 
        templates[i].description?.includes(search)
      ){
        filteredTemplates.push(templates[i])
      }
    }

    return filteredTemplates
  }

  useEffect(() => {
    setFilteredTemplates(filterTemplates())
  },[search])

  return (
    <>
    <Box>
      <SearchField searchSetter={setSearch} />
    </Box>
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
