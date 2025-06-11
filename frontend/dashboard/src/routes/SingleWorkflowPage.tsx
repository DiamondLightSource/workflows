import { Container, Box, Typography } from "@mui/material";
import { useParams, Link } from "react-router-dom";
import { Suspense } from "react";
import "react-resizable/css/styles.css";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";

import { visitTextToVisit } from "workflows-lib/lib/utils/commonUtils";
import SingleWorkflowView from "relay-workflows-lib/lib/components/SingleWorkflowView";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";

function SingleWorkflowPage() {
  const { visitid, workflowName, taskname } = useParams<{
    visitid: string;
    workflowName: string;
    taskname?: string;
  }>();

  const visit = visitTextToVisit(visitid);

  return (
    <>
      <WorkflowsNavbar
        sessionInfo={`Instrument Session ID is ${visitid ?? ""}`}
      />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      {visit && workflowName ? (
        <Container maxWidth="lg">
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <WorkflowsErrorBoundary>
              <Suspense>
                <SingleWorkflowView
                  visit={visit}
                  workflowName={workflowName}
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
