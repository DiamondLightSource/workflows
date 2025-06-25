import { useCallback, useEffect } from "react";
import { useQueryLoader } from "react-relay/hooks";
import { graphql } from "react-relay";
import { Visit, WorkflowQueryFilter } from "workflows-lib";
import { WorkflowsQuery } from "./__generated__/WorkflowsQuery.graphql";
import WorkflowsContent from "./WorkflowsContent";
import { useServerSidePagination } from "./useServerSidePagination";

export const workflowsQuery = graphql`
  query WorkflowsQuery(
    $visit: VisitInput!
    $cursor: String
    $limit: Int!
    $filter: WorkflowFilter
  ) {
    workflows(visit: $visit, cursor: $cursor, limit: $limit, filter: $filter) {
      nodes {
        ...workflowFragment
      }
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
        startCursor
      }
    }
  }
`;

export default function Workflows({
  visit,
  filter,
}: {
  visit: Visit;
  filter?: WorkflowQueryFilter;
}) {
  const {
    cursor,
    currentPage,
    totalPages,
    selectedLimit,
    goToPage,
    changeLimit,
    updatePageInfo,
  } = useServerSidePagination();

  const [queryReference, loadQuery] =
    useQueryLoader<WorkflowsQuery>(workflowsQuery);

  const load = useCallback(() => {
    loadQuery(
      { visit, limit: selectedLimit, cursor, filter },
      { fetchPolicy: "store-and-network" },
    );
  }, [visit, selectedLimit, cursor, filter, loadQuery]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [load]);

  if (!queryReference) return <div>Loading workflows</div>;

  return (
    <WorkflowsContent
      queryReference={queryReference}
      currentPage={currentPage}
      totalPages={totalPages}
      selectedLimit={selectedLimit}
      onPageChange={(
        page: number,
        endCursor: string | null | undefined,
        hasNextPage: boolean | undefined,
      ) => {
        goToPage(page, endCursor, hasNextPage);
      }}
      onLimitChange={changeLimit}
      updatePageInfo={updatePageInfo}
    />
  );
}
