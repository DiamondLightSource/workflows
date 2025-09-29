import { Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Box, Stack } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import {
  WorkflowsErrorBoundary,
  WorkflowsNavbar,
  WorkflowTemplatesFilter,
} from "workflows-lib";
import TemplatesList from "relay-workflows-lib/lib/components/TemplatesList";
import { WorkflowsTemplateFilterDrawer } from "workflows-lib";
import { ScrollRestorer } from "./utils";
import { WorkflowTemplateFilterDisplay } from "workflows-lib/lib/components/workflow/TemplateListFilterDrawer";

const TemplatesListPage: React.FC = () => {
  const [workflowTemplatesFilter, setWorkflowTemplatesFilter] =
    useState<WorkflowTemplatesFilter>({});

  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="md">
        <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
          <Box width="100%" mb={2}>
            <Stack direction="row" spacing={4} alignItems="flex-start">
              <WorkflowsTemplateFilterDrawer
                onApplyFilters={(newFilters: WorkflowTemplatesFilter) => {
                  setWorkflowTemplatesFilter(newFilters);
                }}
              />
              <WorkflowTemplateFilterDisplay filter={workflowTemplatesFilter}/>
            </Stack>
          </Box>
          <WorkflowsErrorBoundary>
            <Suspense>
                <ScrollRestorer />
                <TemplatesList filter={workflowTemplatesFilter} />
            </Suspense>
          </WorkflowsErrorBoundary>
        </Box>
      </Container>
    </>
  );
};

export default TemplatesListPage;
