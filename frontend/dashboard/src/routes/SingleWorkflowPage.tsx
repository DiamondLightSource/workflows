import { Container, Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { Suspense } from "react";
import { visitTextToVisit } from "workflows-lib/lib/utils/commonUtils";
import "react-resizable/css/styles.css";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import SingleWorkflowView from "relay-workflows-lib/lib/components/SingleWorkflowView";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";

function SingleWorkflowPage() {
  const { visitid, workflowname, taskname } = useParams<{
    visitid: string;
    workflowname: string;
    taskname?: string;
  }>();

  const visit = visitTextToVisit(visitid);

  return (
    <>
      <WorkflowsNavbar
        sessionInfo={`Instrument Session ID is ${visitid ?? ""}`}
      />
      <Breadcrumbs path={window.location.pathname} />
      {visit && workflowname ? (
        <Container maxWidth="sm">
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <WorkflowsErrorBoundary>
              <Suspense>
                <SingleWorkflowView
                  visit={visit}
                  workflowname={workflowname}
                  taskname={taskname}
                />
              </Suspense>
            </WorkflowsErrorBoundary>
          </Box>
        </Container>
      ) : (
        <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
          <Typography>No valid workflow selected</Typography>
          {/* Go to instrumentSession or home page */}
        </Box>
      )}
    </>
  );
}

export default SingleWorkflowPage;
