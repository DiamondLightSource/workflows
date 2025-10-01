import { Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Box } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import TemplatesListView from "relay-workflows-lib/lib/views/TemplatesListView";
import {
  WorkflowsErrorBoundary,
  WorkflowsNavbar,
  WorkflowTemplatesFilter,
} from "workflows-lib";

const TemplatesListPage: React.FC = () => {
  const [WorkflowTemplatesFilter, setWorkflowTemplatesFilter] = useState<
    WorkflowTemplatesFilter | undefined
  >(undefined);
  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="md">
        <WorkflowsErrorBoundary>
          <Suspense>
            <Box mt={2} mb={2}>
              <TemplatesListView
                filter={WorkflowTemplatesFilter}
                setFilter={(newFilter: WorkflowTemplatesFilter) => {
                  setWorkflowTemplatesFilter(newFilter);
                }}
              />
            </Box>
          </Suspense>
        </WorkflowsErrorBoundary>
      </Container>
    </>
  );
};

export default TemplatesListPage;
