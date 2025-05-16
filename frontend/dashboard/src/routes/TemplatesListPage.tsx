import { Container, Box } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import TemplatesList from "relay-workflows-lib/lib/components/TemplatesList";
import { Suspense } from "react";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";

const TemplatesListPage: React.FC = () => {
  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} />
      <Container maxWidth="sm">
        <WorkflowsErrorBoundary>
          <Suspense>
            <Box mt={2}>
              <TemplatesList />
            </Box>
          </Suspense>
        </WorkflowsErrorBoundary>
      </Container>
    </>
  );
};

export default TemplatesListPage;
