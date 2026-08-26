import { graphql } from "relay-runtime";
import { type TriggersListViewQuery as TriggersListViewQueryType } from "./__generated__/TriggersListViewQuery.graphql";
import { useQueryLoader } from "react-relay";
import { useCallback, useEffect } from "react";
import TriggersListContent from "../components/TriggersListContent";
import { Box } from "@mui/material";
import { useServerSidePagination } from "../utils/useServerSidePagination";

export const TriggersListViewQuery = graphql`
  query TriggersListViewQuery($limit: Int, $cursor: String) {
    triggers(limit: $limit, cursor: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name
        beamline
        templateRef
      }
    }
  }
`;

export default function TriggersListView() {
  const [queryReference, loadQuery] = useQueryLoader<TriggersListViewQueryType>(
    TriggersListViewQuery,
  );

  const {
    cursor,
    currentPage,
    totalPages,
    selectedLimit,
    goToPage,
    changeLimit,
    updatePageInfo,
  } = useServerSidePagination();

  const load = useCallback(() => {
    loadQuery(
      { limit: selectedLimit, cursor },
      { fetchPolicy: "store-and-network" },
    );
  }, [selectedLimit, cursor, loadQuery]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [load]);

  return (
    <Box width="100%">
      {queryReference && (
        <TriggersListContent
          queryRef={queryReference}
          currentPage={currentPage}
          totalPages={totalPages}
          selectedLimit={selectedLimit}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
          updatePageInfo={updatePageInfo}
        />
      )}
    </Box>
  );
}
