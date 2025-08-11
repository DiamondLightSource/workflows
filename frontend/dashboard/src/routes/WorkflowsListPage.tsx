import { Suspense, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Container, Box, Stack } from "@mui/material";
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
import { useVisitInput, ScrollRestorer } from "./utils";

const WorkflowsListPage: React.FC = () => {
  const { visitid } = useParams<{ visitid?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (visitid) {
      localStorage.setItem("instrumentSessionID", visitid);
    }
  }, [visitid]);

  const instrumentSessionID =
    visitid ?? localStorage.getItem("instrumentSessionID");

  useEffect(() => {
    if (!visitid && instrumentSessionID) {
      (
        navigate(`/workflows/${instrumentSessionID}`, {
          replace: true,
        }) as Promise<void>
      ).catch((error: unknown) => {
        console.error("Navigation error:", error);
      });
    }
  }, [visitid, instrumentSessionID, navigate]);

  const { visit, handleVisitSubmit } = useVisitInput(instrumentSessionID);
  const [workflowQueryFilter, setWorkflowQueryFilter] = useState<
    WorkflowQueryFilter | undefined
  >(undefined);

  return (
    <>
      <WorkflowsNavbar
        sessionInfo={`Instrument Session ID is ${instrumentSessionID ?? ""}`}
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
            {visit && (
              <WorkflowsErrorBoundary key={JSON.stringify(workflowQueryFilter)}>
                <Suspense>
                  <ScrollRestorer />
                  <Workflows visit={visit} filter={workflowQueryFilter} />
                </Suspense>
              </WorkflowsErrorBoundary>
            )}
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default WorkflowsListPage;
