import { Container, Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { Suspense } from "react";
import { visitTextToVisit } from "workflows-lib/lib/components/common/utils";
import "react-resizable/css/styles.css";
import {
  ThemeProvider,
  DiamondTheme,
} from "@diamondlightsource/sci-react-ui";
import { SingleWorkflowInfo } from "relay-workflows-lib/lib/components/SingleWorkflowView";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import Button from "@mui/material/Button";

function WorkflowView() {
  const { visitid, workflowname, taskname } = useParams<{
    visitid: string;
    workflowname: string;
    taskname?: string;
  }>();

  const visit = visitTextToVisit(visitid);

  return (
    <ThemeProvider theme={DiamondTheme} defaultMode="light">
      <WorkflowsNavbar
        title={"Workflow Information"}
        sessionInfo={`Instrument Session ID is ${visitid?? ""}`}
      ></WorkflowsNavbar>
        <Button
          startIcon={<ArrowBackIosIcon />}
          href={`/workflows/${visitid?? ""}`}
          sx={{
            margin: 2,
            justifyContent: "left",
          textAlign: "center",
        }}
        >
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Workflow List
          </Typography>
        </Button>
      {visit && workflowname ? (
        <Container maxWidth="sm">
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <WorkflowsErrorBoundary>
              <Suspense>
              <SingleWorkflowInfo
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
    </ThemeProvider>
  );
}

export default WorkflowView;
