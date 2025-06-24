import { useEffect } from "react";
import { PreloadedQuery, usePreloadedQuery } from "react-relay";
import { PaginationControls } from "workflows-lib";
import { workflowsQuery } from "./Workflows";
import WorkflowRelay from "./WorkflowRelay";
import {
  WorkflowsQuery,
  WorkflowsQuery as WorkflowsQueryType,
} from "./__generated__/WorkflowsQuery.graphql";

interface WorkflowsContentProps {
  queryReference: PreloadedQuery<WorkflowsQuery>;
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
}

export default function WorkflowsContent({
  queryReference,
  currentPage,
  totalPages,
  selectedLimit,
  onPageChange,
  onLimitChange,
  updatePageInfo,
}: WorkflowsContentProps) {
  const data = usePreloadedQuery<WorkflowsQueryType>(
    workflowsQuery,
    queryReference,
  );
  const workflows = data.workflows.nodes;
  const pageInfo = data.workflows.pageInfo;

  useEffect(() => {
    updatePageInfo(pageInfo.hasNextPage, pageInfo.endCursor ?? null);
  }, [pageInfo, updatePageInfo]);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div style={{ overflowY: "auto", maxHeight: "80vh", width: "100%" }}>
        {workflows.map((node, index) => (
          <WorkflowRelay key={index} workflow={node} workflowLink={true} />
        ))}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page: number) => {
          onPageChange(page, pageInfo.endCursor, pageInfo.hasNextPage);
        }}
        selectedLimit={selectedLimit}
        onLimitChange={onLimitChange}
      />
    </div>
  );
}
