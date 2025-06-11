import { Suspense } from "react";
import { Link } from "react-router-dom";
import { Container, Box } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import { WorkflowsErrorBoundary, WorkflowsNavbar } from "workflows-lib";
import TemplatesList from "relay-workflows-lib/lib/components/TemplatesList";

const TemplatesListPage: React.FC = () => {
  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="md">
        <WorkflowsErrorBoundary>
          <Suspense>
            <Box mt={2} mb={2}>
              <TemplatesList />
            </Box>
          </Suspense>
        </WorkflowsErrorBoundary>
      </Container>
    </>
  );
};

export default TemplatesListPage;
