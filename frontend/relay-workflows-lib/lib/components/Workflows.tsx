import WorkflowRelay from "relay-workflows-lib/lib/components/WorkflowRelay";
import { WorkflowsQuery as WorkflowsQueryType } from "./__generated__/WorkflowsQuery.graphql";
import { workflowFragment$key } from "./__generated__/workflowFragment.graphql";
import { graphql } from "relay-runtime";
import { useLazyLoadQuery } from "react-relay/hooks";
import { Visit } from "workflows-lib";
import { useState, useCallback, useEffect, startTransition } from "react";
import Pagination from "@mui/material/Pagination";

const WorkflowsQuery = graphql`
  query WorkflowsQuery($visit: VisitInput!, $cursor: String, $limit: Int!) {
    workflows(visit: $visit, cursor: $cursor, limit: $limit) {
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

export default function Workflows({ visit }: { visit: Visit }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<workflowFragment$key[]>([]);
  const [cursorHistory, setCursorHistory] = useState<{
    [page: number]: string | null;
  }>({ 1: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const data = useLazyLoadQuery<WorkflowsQueryType>(WorkflowsQuery, {
    visit,
    limit: 5,
    cursor,
  });

  const updateWorkflows = (
    nodes: WorkflowsQueryType["response"]["workflows"]["nodes"]
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
    [cursorHistory, currentPage]
  );

  useEffect(() => {
    updateWorkflows(data.workflows.nodes);
    updateTotalPages(data.workflows.pageInfo);
  }, [data, cursorHistory, updateTotalPages]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
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
    <div key={index} style={{ width: "1200px", height: "100%" }}>
      <WorkflowRelay key={index} workflow={node}>
        ""
      </WorkflowRelay>
    </div>
  ));

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
      <div style={{ marginTop: "20px" }}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          showFirstButton
        />
      </div>
    </div>
  );
}
