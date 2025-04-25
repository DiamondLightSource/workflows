import { Container, Box } from "@mui/material";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import { useParams } from "react-router-dom";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import TemplateView from "relay-workflows-lib/lib/components/TemplateView";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";
import { Suspense } from "react";
const TemplatesView: React.FC = () => {
  const { templateName } = useParams<{ templateName: string }>();

  return (
    <>
      <ThemeProvider theme={DiamondTheme} defaultMode="light">
        <WorkflowsNavbar />
        <Container maxWidth="sm">
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <WorkflowsErrorBoundary>
              <Suspense>
                {templateName ? (
                  <TemplateView templateName={templateName} />
                ) : null}
              </Suspense>
            </WorkflowsErrorBoundary>
          </Box>
        </Container>
      </ThemeProvider>
    </>
  );
};

export default TemplatesView;
