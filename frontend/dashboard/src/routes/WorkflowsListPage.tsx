import { Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, Box, Typography, Stack } from "@mui/material";
import {
  VisitInput,
  Breadcrumbs,
  visitToText,
} from "@diamondlightsource/sci-react-ui";
import Workflows from "relay-workflows-lib/lib/components/Workflows";
import {
  WorkflowQueryFilter,
  WorkflowsErrorBoundary,
  WorkflowListFilterDrawer,
  WorkflowsNavbar,
} from "workflows-lib";
import { WorkflowListFilterDisplay } from "workflows-lib/lib/components/workflow/WorkflowListFilterDrawer";
import { useVisitInput } from "./utils";

const WorkflowsListPage: React.FC = () => {
  const { visitid } = useParams<{ visitid: string }>();
  const { visit, handleVisitSubmit } = useVisitInput(visitid);
  const [workflowQueryFilter, setWorkflowQueryFilter] = useState<
    WorkflowQueryFilter | undefined
  >(undefined);

  return (
    <>
      <WorkflowsNavbar
        sessionInfo={`Instrument Session ID is ${visitid ?? ""}`}
      />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="lg">
        <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
          <Box width="100%" mb={2}>
            <Stack direction="row" spacing={4} alignItems="flex-start">
              <Stack spacing={2}>
                <VisitInput
                  onSubmit={handleVisitSubmit}
                  visit={visit ?? undefined}
                />
                <WorkflowListFilterDrawer
                  onApplyFilters={(newFilters: WorkflowQueryFilter) => {
                    setWorkflowQueryFilter(newFilters);
                  }}
                />
              </Stack>
              {workflowQueryFilter && (
                <WorkflowListFilterDisplay filter={workflowQueryFilter} />
              )}
            </Stack>
          </Box>
          <Box width="100%" key={visit ? visitToText(visit) : "invalid-visit"}>
            {visit ? (
              <WorkflowsErrorBoundary key={JSON.stringify(workflowQueryFilter)}>
                <Suspense>
                  <Workflows visit={visit} filter={workflowQueryFilter} />
                </Suspense>
              </WorkflowsErrorBoundary>
            ) : (
              <Typography variant="h6" color="red" pt={1} gutterBottom>
                Instrument Session ID {visitid} is invalid
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default WorkflowsListPage;
