import { Container, Box, Typography } from "@mui/material";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Suspense, useMemo } from "react";
import "react-resizable/css/styles.css";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";

import {
  visitTextToVisit,
  WorkflowErrorBoundaryWithRetry,
} from "workflows-lib";
import { SingleWorkflowView, WorkflowsNavbar } from "relay-workflows-lib";
import { tidyPath } from "./utils";

function SingleWorkflowPage() {
  const { visitid, workflowId } = useParams<{
    visitid: string;
    workflowId: string;
  }>();

  const [searchParams] = useSearchParams();
  const taskParam = searchParams.get("tasks");

  if (visitid) {
    localStorage.setItem("instrumentSessionID", visitid);
  }

  const taskIds = useMemo(() => {
    if (!taskParam) return [];
    try {
      return JSON.parse(taskParam) as string[];
    } catch {
      return [];
    }
  }, [taskParam]);

  const visit = visitTextToVisit(visitid);

  return (
    <>
      <WorkflowsNavbar
        sessionInfo={`Instrument Session ID is ${visitid ?? ""}`}
      />
      <Breadcrumbs
        path={tidyPath(window.location.pathname)}
        linkComponent={Link}
      />
      {visit && workflowId ? (
        <Container maxWidth="lg">
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            mt={2}
            mb={4}
          >
            <WorkflowErrorBoundaryWithRetry>
              {({ fetchKey }) => (
                <Suspense
                  key={`workflow-${workflowId}-${JSON.stringify(fetchKey)}`}
                  fallback={
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Loading Workflow...
                      </Typography>
                    </Box>
                  }
                >
                  <SingleWorkflowView
                    workflowId={workflowId}
                    taskIds={taskIds}
                  />

                  {/* Real-time Task Log Viewer */}
                  {/* <TaskLogViewer
                    visit={visit}
                    workflowName={workflowName}
                    selectedTaskId={selectedTaskId}
                  /> */}
                </Suspense>
              )}
            </WorkflowErrorBoundaryWithRetry>
          </Box>
        </Container>
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          mt={2}
          mb={4}
        >
          <Typography>No valid workflow selected</Typography>
        </Box>
      )}
    </>
  );
}

export default SingleWorkflowPage;
