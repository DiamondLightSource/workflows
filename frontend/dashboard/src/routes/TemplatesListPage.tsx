import { Container, Box } from "@mui/material";
import {
  ThemeProvider,
  DiamondTheme,
  Breadcrumbs,
} from "@diamondlightsource/sci-react-ui";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import TemplatesList from "relay-workflows-lib/lib/components/TemplatesList";
import { Suspense } from "react";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";

const TemplatesListPage: React.FC = () => {
  return (
    <>
      <ThemeProvider theme={DiamondTheme} defaultMode="light">
        <WorkflowsNavbar />
        <Breadcrumbs path={window.location.pathname} />
        <Container maxWidth="sm">
          <WorkflowsErrorBoundary>
            <Suspense>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                mt={2}
              >
                <TemplatesList />
              </Box>
            </Suspense>
          </WorkflowsErrorBoundary>
        </Container>
      </ThemeProvider>
    </>
  );
};

export default TemplatesListPage;
