import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryLoader } from "react-relay/hooks";
import { Visit, WorkflowQueryFilter } from "workflows-lib";
import { workflowsQuery as WorkflowsQueryType } from "../graphql/__generated__/workflowsQuery.graphql";
import WorkflowsContent from "./WorkflowsContent";
import { useServerSidePagination } from "./useServerSidePagination";
import { workflowsQuery } from "../graphql/workflowsQuery";

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
    useQueryLoader<WorkflowsQueryType>(workflowsQuery);

  const [isPaginated, setIsPaginated] = useState(false);
  const lastPage = useRef(currentPage);
  const lastLimit = useRef(selectedLimit);

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

  useEffect(() => {
    if (
      currentPage !== lastPage.current ||
      selectedLimit !== lastLimit.current
    ) {
      setIsPaginated(true);
      lastPage.current = currentPage;
      lastLimit.current = selectedLimit;
    }
  }, [currentPage, selectedLimit]);

  if (!queryReference) return <div>Loading workflows</div>;

  return (
    <WorkflowsContent
      queryReference={queryReference}
      currentPage={currentPage}
      totalPages={totalPages}
      selectedLimit={selectedLimit}
      onPageChange={(page, endCursor, hasNextPage) => {
        goToPage(page, endCursor, hasNextPage);
      }}
      onLimitChange={changeLimit}
      updatePageInfo={updatePageInfo}
      isPaginated={isPaginated}
      setIsPaginated={setIsPaginated}
      visit={visit}
    />
  );
}
