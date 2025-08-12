import { useEffect, useRef, useState, useMemo } from "react";
import { PreloadedQuery, usePreloadedQuery } from "react-relay";
import { Box, Button, FormControlLabel, Switch, useTheme } from "@mui/material";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { PaginationControls } from "workflows-lib";
import { workflowsQuery } from "../graphql/workflowsQuery";
import WorkflowRelay from "./WorkflowRelay";
import { updateWorkflowsState } from "../utils";
import { workflowsQuery as WorkflowsQueryType } from "../graphql/__generated__/workflowsQuery.graphql";

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
  setIsPaginated: (b: boolean) => void;
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
  setIsPaginated,
  visit,
}: WorkflowsContentProps) {
  const theme = useTheme();
  const data = usePreloadedQuery(workflowsQuery, queryReference);
  const pageInfo = data.workflows.pageInfo;
  const fetchedWorkflows = useMemo(() => {
    return data.workflows.nodes.map((wf: { readonly name: string }) => wf.name);
  }, [data.workflows.nodes]);
  const prevFetchedRef = useRef<string[]>([]);

  const [visibleWorkflows, setVisibleWorkflows] =
    useState<string[]>(fetchedWorkflows);
  const [newWorkflows, setNewWorkflows] = useState<string[]>([]);
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(
    new Set(),
  );
  const [liveUpdate, setLiveUpdate] = useState(false);
  useEffect(() => {
    updatePageInfo(pageInfo.hasNextPage, pageInfo.endCursor ?? null);
  }, [pageInfo, updatePageInfo]);

  useEffect(() => {
    const fetchedChanged = prevFetchedRef.current !== fetchedWorkflows;

    if ((isPaginated || liveUpdate) && fetchedChanged) {
      setVisibleWorkflows(fetchedWorkflows);
      setNewWorkflows([]);
      setExpandedWorkflows(new Set());
      prevFetchedRef.current = fetchedWorkflows;

      if (isPaginated) {
        setTimeout(() => {
          setIsPaginated(false);
        }, 0);
      }
    } else if (fetchedChanged) {
      updateWorkflowsState(
        fetchedWorkflows,
        visibleWorkflows,
        newWorkflows,
        setNewWorkflows,
      );
      prevFetchedRef.current = fetchedWorkflows;
    }
  }, [
    isPaginated,
    fetchedWorkflows,
    newWorkflows,
    visibleWorkflows,
    liveUpdate,
    setIsPaginated,
  ]);
  const handleShowNewWorkflows = () => {
    const combined = [...new Set([...newWorkflows, ...visibleWorkflows])];
    const trimmed = combined.slice(0, selectedLimit);
    setVisibleWorkflows(trimmed);
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

  const toggleLiveUpdate = () => {
    setLiveUpdate((prev) => !prev);
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          pr: 2,
        }}
      >
        <FormControlLabel
          control={<Switch sx={{ color: theme.palette.primary.dark }} />}
          label="Live Update"
          sx={{ position: "right" }}
          value={liveUpdate}
          onChange={toggleLiveUpdate}
        />
      </Box>

      {!liveUpdate && currentPage === 1 && newWorkflows.length > 0 && (
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
