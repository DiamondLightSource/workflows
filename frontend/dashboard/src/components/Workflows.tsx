import WorkflowRelay from "./WorkflowRelay";
import { WorkflowsQuery as WorkflowsQueryType } from "./__generated__/WorkflowsQuery.graphql";
import { graphql } from "relay-runtime";
import { useLazyLoadQuery } from "react-relay/hooks";
import { Visit } from "workflows-lib";
import { useState, useEffect, startTransition } from "react";
import Pagination from "@mui/material/Pagination";

const WorkflowsQuery = graphql`
  query WorkflowsQuery($visit: VisitInput!, $cursor: String, $limit: Int!) {
    workflows(visit: $visit, cursor: $cursor, limit: $limit) {
      nodes {
        ...WorkflowRelayFragment
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
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [cursorHistory, setCursorHistory] = useState(
    new Set<string | null>([null])
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  console.log("Fetching data");
  const data = useLazyLoadQuery<WorkflowsQueryType>(WorkflowsQuery, {
    visit,
    limit: 3,
    cursor,
  });
  console.log("Fetched data");
  useEffect(() => {
    if (data) {
      setWorkflows([...data.workflows.nodes]);
      if (currentPage === totalPages && data.workflows.pageInfo.hasNextPage) {
        setTotalPages(cursorHistory.size + 1);
      } else {
        setTotalPages(cursorHistory.size);
      }
    }
  }, [data, cursorHistory]);

  if (!data) {
    return <div>Loading...</div>;
  }

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    const cursorArray = Array.from(cursorHistory);
    if (page > currentPage && data.workflows.pageInfo.hasNextPage) {
      loadMore();
    } else {
      const newCursor = cursorArray[page - 1];
      startTransition(() => {
        setCursor(newCursor);
        setCurrentPage(page);
      });
    }
  };

  const loadMore = () => {
    if (data.workflows.pageInfo.hasNextPage) {
      startTransition(() => {
        const newCursor = data.workflows.pageInfo.endCursor ?? null;
        setCursorHistory((prevCursorHistory) => {
          const updatedCursorHistory = new Set(prevCursorHistory);
          updatedCursorHistory.add(newCursor);
          return updatedCursorHistory;
        });
        setCursor(data.workflows.pageInfo.endCursor || null);
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
