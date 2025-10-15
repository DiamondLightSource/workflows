import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { VisitInput, visitToText } from "@diamondlightsource/sci-react-ui";
import WorkflowListFilterDrawer from "relay-workflows-lib/lib/components/WorkflowListFilterDrawer";
import { WorkflowQueryFilter } from "workflows-lib";
import WorkflowErrorBoundaryWithRetry from "workflows-lib/lib/components/workflow/WorkflowErrorBoundaryWithRetry";
import { WorkflowListFilterDisplay } from "relay-workflows-lib/lib/components/WorkflowListFilterDrawer";
import { useVisitInput, ScrollRestorer } from "../utils/coreUtils";
import { graphql, useLazyLoadQuery, useQueryLoader } from "react-relay";
import { WorkflowsListViewQuery as WorkflowsListViewQueryType } from "./__generated__/WorkflowsListViewQuery.graphql";
import { useServerSidePagination } from "../utils/useServerSidePagination";
import { WorkflowsListViewTemplatesQuery as WorkflowsListViewTemplatesQueryType } from "./__generated__/WorkflowsListViewTemplatesQuery.graphql";
import WorkflowsContent from "../components/WorkflowsContent";

export const WorkflowsListViewQuery = graphql`
  query WorkflowsListViewQuery(
    $visit: VisitInput!
    $limit: Int
    $cursor: String
    $filter: WorkflowFilter
  ) {
    workflows(visit: $visit, limit: $limit, cursor: $cursor, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name
      }
      ...WorkflowsContentFragment
    }
  }
`;

const WorkflowsListViewTemplatesQuery = graphql`
  query WorkflowsListViewTemplatesQuery {
    workflowTemplates {
      ...WorkflowListFilterDrawerFragment
    }
  }
`;

type WorkflowsListViewProps = {
  instrumentSessionID: string | null;
};

const WorkflowsListView: React.FC<WorkflowsListViewProps> = ({
  instrumentSessionID,
}) => {
  const { visit, handleVisitSubmit } = useVisitInput(instrumentSessionID);
  const [workflowQueryFilter, setWorkflowQueryFilter] = useState<
    WorkflowQueryFilter | undefined
  >(undefined);
  const [filterChangeKey, setFilterChangeKey] = useState(0);

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
    useQueryLoader<WorkflowsListViewQueryType>(WorkflowsListViewQuery);

  const templateData = useLazyLoadQuery<WorkflowsListViewTemplatesQueryType>(
    WorkflowsListViewTemplatesQuery,
    {},
    { fetchPolicy: "store-and-network" },
  );

  const [isPaginated, setIsPaginated] = useState(false);
  const lastPage = useRef(currentPage);
  const lastLimit = useRef(selectedLimit);

  const load = useCallback(() => {
    if (visit) {
      loadQuery(
        { visit, limit: selectedLimit, cursor, filter: workflowQueryFilter },
        { fetchPolicy: "store-and-network" },
      );
    }
  }, [visit, selectedLimit, cursor, workflowQueryFilter, loadQuery]);

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

  const handleApplyFilters = useCallback((newFilters: WorkflowQueryFilter) => {
    setWorkflowQueryFilter(newFilters);
    setFilterChangeKey((prev) => prev + 1);
  }, []);

  return (
    <>
      <Box width="100%" mb={2}>
        <Stack direction="row" spacing={4} alignItems="flex-start">
          <Stack spacing={2}>
            <VisitInput
              onSubmit={handleVisitSubmit}
              visit={visit ?? undefined}
            />
            <Suspense>
              <WorkflowListFilterDrawer
                data={templateData.workflowTemplates}
                onApplyFilters={handleApplyFilters}
              />
            </Suspense>
          </Stack>
          {workflowQueryFilter && (
            <WorkflowListFilterDisplay filter={workflowQueryFilter} />
          )}
        </Stack>
      </Box>

      <Box width="100%" key={visit ? visitToText(visit) : "invalid-visit"}>
        {visit && queryReference && (
          <WorkflowErrorBoundaryWithRetry key={filterChangeKey}>
            {({ fetchKey }) => (
              <Suspense
                key={`${JSON.stringify(workflowQueryFilter)}-${JSON.stringify(fetchKey)}`}
                fallback={
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Loading Workflows...
                    </Typography>
                  </Box>
                }
              >
                <ScrollRestorer />
                <WorkflowsContent
                  queryReference={queryReference}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  selectedLimit={selectedLimit}
                  onPageChange={goToPage}
                  onLimitChange={changeLimit}
                  updatePageInfo={updatePageInfo}
                  isPaginated={isPaginated}
                  setIsPaginated={setIsPaginated}
                />
              </Suspense>
            )}
          </WorkflowErrorBoundaryWithRetry>
        )}
      </Box>
    </>
  );
};

export default WorkflowsListView;
