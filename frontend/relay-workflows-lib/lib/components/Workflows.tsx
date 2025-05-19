import WorkflowRelay from "relay-workflows-lib/lib/components/WorkflowRelay";
import { WorkflowsQuery as WorkflowsQueryType } from "./__generated__/WorkflowsQuery.graphql";
import { workflowFragment$key } from "../graphql/__generated__/workflowFragment.graphql";
import { useLazyLoadQuery } from "react-relay/hooks";
import { Visit, WorkflowQueryFilter } from "workflows-lib";
import { useState, useCallback, useEffect, startTransition } from "react";
import Pagination from "@mui/material/Pagination";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { graphql } from "relay-runtime";

const workflowsQuery = graphql`
  query WorkflowsQuery($visit: VisitInput!, $cursor: String, $limit: Int!, $filter: WorkflowFilter) {
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

export default function Workflows({ visit, filter }: { visit: Visit, filter?: WorkflowQueryFilter }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<workflowFragment$key[]>([]);
  const [cursorHistory, setCursorHistory] = useState<{
    [page: number]: string | null;
  }>({ 1: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLimit, setSelectedLimit] = useState(10);


  const data = useLazyLoadQuery<WorkflowsQueryType>(workflowsQuery, {
    visit,
    limit: selectedLimit,
    cursor,
    filter
  });

  const updateWorkflows = (
    nodes: WorkflowsQueryType["response"]["workflows"]["nodes"],
  ) => {
    setWorkflows([...nodes]);
  };

  const updateTotalPages = useCallback(
    (pageInfo: WorkflowsQueryType["response"]["workflows"]["pageInfo"]) => {
      const hasNextPage = pageInfo.hasNextPage;
      const currentPageCount = Object.keys(cursorHistory).length;

      if (hasNextPage && !cursorHistory[currentPage + 1]) {
        setTotalPages(currentPageCount + 1);
      } else {
        setTotalPages(currentPageCount);
      }
    },
    [cursorHistory, currentPage],
  );

  useEffect(() => {
    updateWorkflows(data.workflows.nodes);
    updateTotalPages(data.workflows.pageInfo);
  }, [data, cursorHistory, updateTotalPages]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    const targetCursor = cursorHistory[page];
    if (
      !targetCursor &&
      page === currentPage + 1 &&
      data.workflows.pageInfo.hasNextPage
    ) {
      loadMore();
    } else {
      startTransition(() => {
        setCursor(targetCursor);
        setCurrentPage(page);
      });
    }
  };

  const loadMore = () => {
    if (data.workflows.pageInfo.hasNextPage) {
      startTransition(() => {
        const newCursor = data.workflows.pageInfo.endCursor ?? null;
        if (!Object.values(cursorHistory).includes(newCursor)) {
          setCursorHistory((prevCursorHistory) => ({
            ...prevCursorHistory,
            [currentPage + 1]: newCursor,
          }));
        }
        setCursor(newCursor);
        setCurrentPage(currentPage + 1);
      });
    }
  };

  const workflowList = workflows.map((node, index) => (
    <WorkflowRelay key={index} workflow={node} />
  ));

  const limitChanged = (event: SelectChangeEvent) => {
    setSelectedLimit(Number(event.target.value));
    setCursorHistory({ 1: null });
    setCurrentPage(1);
    setCursor(null);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {workflowList}

      <Box
        sx={{
          display: "flex",
          flexDirection: {
            xs: "column",
            sm: "row",
          },
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          mt: 2,
        }}
      >
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          showFirstButton
          siblingCount={1}
          boundaryCount={0}
        />

        <FormControl sx={{ width: 80 }}>
          <Select
            size="small"
            labelId="setLimitSelector"
            value={selectedLimit.toString()}
            aria-label="Results Per Page"
            onChange={limitChanged}
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={30}>30</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </div>
  );
}
