import { Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Box } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import {
  WorkflowsErrorBoundary,
  WorkflowsNavbar,
  WorkflowTemplatesFilter,
} from "workflows-lib";
import TemplatesList from "relay-workflows-lib/lib/components/TemplatesList";
import { WorkflowsTemplateFilterDrawer } from "workflows-lib";

const TemplatesListPage: React.FC = () => {
  const [workflowTemplatesFilter, setWorkflowTemplatesFilter] =
    useState<WorkflowTemplatesFilter>({});

  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="md">
        <WorkflowsErrorBoundary>
          <Suspense>
            <Box mt={2} mb={2}>
              <WorkflowsTemplateFilterDrawer
                onApplyFilters={(newFilters: WorkflowTemplatesFilter) => {
                  setWorkflowTemplatesFilter(newFilters);
                }}
              />
              <TemplatesList filter={workflowTemplatesFilter} />
            </Box>
          </Suspense>
        </WorkflowsErrorBoundary>
      </Container>
    </>
  );
};

export default TemplatesListPage;
