import { Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Box, Typography } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import { WorkflowsNavbar, WorkflowTemplatesFilter } from "workflows-lib";
import TemplatesListView from "relay-workflows-lib/lib/views/TemplatesListView";
import WorkflowErrorBoundaryWithRetry from "workflows-lib/lib/components/workflow/WorkflowErrorBoundaryWithRetry";

const TemplatesListPage: React.FC = () => {
  const [workflowTemplatesFilter, setWorkflowTemplatesFilter] = useState<
    WorkflowTemplatesFilter | undefined
  >(undefined);
  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="md">
        <WorkflowErrorBoundaryWithRetry>
          {({ fetchKey }) => (
            <Suspense
              key={JSON.stringify(fetchKey)}
              fallback={
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Loading Templates...
                  </Typography>
                </Box>
              }
            >
              <Box mt={2} mb={2}>
                <TemplatesListView
                  filter={workflowTemplatesFilter}
                  setFilter={(newFilter: WorkflowTemplatesFilter) => {
                    setWorkflowTemplatesFilter(newFilter);
                  }}
                />
              </Box>
            </Suspense>
          )}
        </WorkflowErrorBoundaryWithRetry>
      </Container>
    </>
  );
};

export default TemplatesListPage;
