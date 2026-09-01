import { useEffect, useRef, useState } from "react";
import {
  graphql,
  PreloadedQuery,
  useFragment,
  usePreloadedQuery,
} from "react-relay";
import { Box } from "@mui/material";
import { PaginationControls } from "workflows-lib";
import { WorkflowsContentFragment$key } from "./__generated__/WorkflowsContentFragment.graphql";
import WorkflowRelay from "./WorkflowRelay";
import { WorkflowsListViewQuery as WorkflowsListViewQueryType } from "../views/__generated__/WorkflowsListViewQuery.graphql";
import { WorkflowsListViewQuery } from "../views/WorkflowsListView";

export const WorkflowsContentFragment = graphql`
  fragment WorkflowsContentFragment on WorkflowConnection {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ...WorkflowRelayFragment
      id
    }
  }
`;

interface WorkflowsContentProps {
  queryReference: PreloadedQuery<WorkflowsListViewQueryType>;
  currentPage: number;
  totalPages: number;
  selectedLimit: number;
  onPageChange: (
    page: number,
    endCursor?: string | null,
    hasNextPage?: boolean,
  ) => void;
  onLimitChange: (limit: number) => void;
  updatePageInfo: (hasNextPage: boolean, endCursor: string | null) => void;
  isPaginated: boolean;
  setIsPaginated: (isPaginated: boolean) => void;
}

export default function WorkflowsContent({
  queryReference,
  currentPage,
  totalPages,
  selectedLimit,
  onPageChange,
  onLimitChange,
  updatePageInfo,
  isPaginated,
  setIsPaginated,
}: WorkflowsContentProps) {
  const queryData = usePreloadedQuery(WorkflowsListViewQuery, queryReference);
  const data = useFragment<WorkflowsContentFragment$key>(
    WorkflowsContentFragment,
    queryData.workflows,
  );
  const pageInfo = data.pageInfo;
  const fetchedWorkflows = data.nodes;
  const prevFetchedRef = useRef<string[]>([]);
  const isPaginatedRef = useRef<boolean>(isPaginated);

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    updatePageInfo(pageInfo.hasNextPage, pageInfo.endCursor ?? null);
  }, [pageInfo, updatePageInfo]);

  useEffect(() => {
    const currentIds = fetchedWorkflows.map((wf) => wf.id);
    const prevIds = prevFetchedRef.current;
    const fetchedChanged =
      JSON.stringify(currentIds) !== JSON.stringify(prevIds);
    if (fetchedChanged && isPaginatedRef.current) {
      setTimeout(() => {
        isPaginatedRef.current = false;
        setIsPaginated(false);
      }, 0);
    }
  }, [isPaginatedRef, fetchedWorkflows, setIsPaginated]);

  const handleToggleExpanded = (id: string) => {
    setExpandedWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box sx={{ overflowY: "auto", maxHeight: "80vh", width: "100%" }}>
        {fetchedWorkflows.map((node) => (
          <WorkflowRelay
            key={node.id}
            fragmentRef={node}
            workflowLink
            expanded={expandedWorkflows.has(node.id)}
            onChange={() => {
              handleToggleExpanded(node.id);
            }}
          />
        ))}
      </Box>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => {
          onPageChange(page, pageInfo.endCursor, pageInfo.hasNextPage);
        }}
        selectedLimit={selectedLimit}
        onLimitChange={onLimitChange}
      />
    </Box>
  );
}
