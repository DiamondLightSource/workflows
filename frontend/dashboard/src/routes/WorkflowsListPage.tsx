import { Container, Box, Typography, Drawer, Button, TextField } from "@mui/material";
import Workflows from "relay-workflows-lib/lib/components/Workflows";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";
import { useParams } from "react-router-dom";
import { Suspense, useState } from "react";
import {
  VisitInput,
  ThemeProvider,
  DiamondTheme,
  Breadcrumbs,
} from "@diamondlightsource/sci-react-ui";

import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import WorkflowListFilterDrawer from "workflows-lib/lib/components/workflow/WorkflowListFilterDrawer"
import { useVisitInput } from "./utils";
import { visitToText } from "workflows-lib/lib/utils/commonUtils";
import { WorkflowListFilter } from "workflows-lib";

const WorkflowsListPage: React.FC = () => {
  const { visitid } = useParams<{ visitid: string }>();
  const { visit, handleVisitSubmit } = useVisitInput(visitid);
  const [workflowListFilters, setWorkflowQueryFilters] = useState<WorkflowListFilter | undefined >(undefined);

  const applyFilters = (newFilters: WorkflowListFilter) => {
    setWorkflowQueryFilters(newFilters);
    console.log(newFilters);

  };

  return (
    <>
      <ThemeProvider theme={DiamondTheme} defaultMode="light">
        <WorkflowsNavbar
          sessionInfo={`Instrument Session ID is ${visitid ?? ""}`}
        />
        <Breadcrumbs path={window.location.pathname} />
        <Container maxWidth="sm">
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <Box width="100%" mb={2}>
              <VisitInput
                onSubmit={handleVisitSubmit}
                visit={visit ?? undefined}
              />
            <WorkflowListFilterDrawer onApplyFilters={applyFilters} />
            </Box>
            <Box
              width="100%"
              key={visit ? visitToText(visit) : "invalid-visit"}
            >
              {visit ? (
                <WorkflowsErrorBoundary>
                  <Suspense>
                    <Workflows visit={visit} filters={workflowListFilters} />
                  </Suspense>
                </WorkflowsErrorBoundary>
              ) : (
                <Typography variant="h6" color="red" pt={1} gutterBottom>
                  Visit {visitid} is invalid
                </Typography>
              )}
            </Box>
          </Box>
        </Container>
      </ThemeProvider>
    </>
  );
};

export default WorkflowsListPage;
