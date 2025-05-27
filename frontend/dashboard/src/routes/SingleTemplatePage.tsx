import { useParams } from "react-router-dom";
import { Container, Box } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import TemplateView from "relay-workflows-lib/lib/components/TemplateView";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";
import { Suspense } from "react";
const SingleTemplatePage: React.FC = () => {
  const { templateName } = useParams<{ templateName: string }>();
  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} />
      <Container maxWidth="md">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          mt={2}
          mb={10}
        >
          <WorkflowsErrorBoundary>
            <Suspense>
              {templateName ? (
                <TemplateView templateName={templateName} />
              ) : null}
            </Suspense>
          </WorkflowsErrorBoundary>
        </Box>
      </Container>
    </>
  );
};

export default SingleTemplatePage;
