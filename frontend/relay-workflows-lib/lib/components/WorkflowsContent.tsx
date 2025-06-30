import { useEffect, useState } from "react";
import { PreloadedQuery, usePreloadedQuery } from "react-relay";
import { workflowsQuery } from "./Workflows";
import { WorkflowsQuery as WorkflowsQueryType } from "./__generated__/WorkflowsQuery.graphql";
import { PaginationControls } from "workflows-lib";
import { Box, Button } from "@mui/material";
import { updateWorkflowsState } from "../utils";
import { Visit } from "@diamondlightsource/sci-react-ui";
import WorkflowRelay from "./WorkflowRelay";

interface WorkflowsContentProps {
  queryReference: PreloadedQuery<WorkflowsQueryType>;
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
  visit: Visit;
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
  visit,
}: WorkflowsContentProps) {
  const data = usePreloadedQuery(workflowsQuery, queryReference);
  const pageInfo = data.workflows.pageInfo;
  const fetchedWorkflows = data.workflows.nodes.map(
    (wf: { readonly name: string }) => wf.name,
  );
  const [visibleWorkflows, setVisibleWorkflows] =
    useState<string[]>(fetchedWorkflows);
  const [newWorkflows, setNewWorkflows] = useState<string[]>([]);
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(
    new Set(),
  );
  useEffect(() => {
    updatePageInfo(pageInfo.hasNextPage, pageInfo.endCursor ?? null);
  }, [pageInfo, updatePageInfo]);

  useEffect(() => {
    if (isPaginated) {
      setVisibleWorkflows(fetchedWorkflows);
      setNewWorkflows([]);
      setExpandedWorkflows(new Set());
    } else {
      updateWorkflowsState(
        fetchedWorkflows,
        visibleWorkflows,
        newWorkflows,
        setVisibleWorkflows,
        setNewWorkflows,
      );
    }
  }, [isPaginated, fetchedWorkflows, newWorkflows, visibleWorkflows]);

  const handleShowNewWorkflows = () => {
    setVisibleWorkflows([...newWorkflows, ...visibleWorkflows]);
    setNewWorkflows([]);
  };

  const handleToggleExpanded = (name: string) => {
    setExpandedWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {newWorkflows.length > 0 && (
        <Button
          onClick={handleShowNewWorkflows}
          variant="contained"
          sx={{ margin: "1rem" }}
        >
          Show New Workflows
        </Button>
      )}

      <Box sx={{ overflowY: "auto", maxHeight: "80vh", width: "100%" }}>
        {visibleWorkflows.map((n) => (
          <WorkflowRelay
            key={n}
            visit={visit}
            workflowName={n}
            workflowLink
            expanded={expandedWorkflows.has(n)}
            onChange={() => {
              handleToggleExpanded(n);
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
