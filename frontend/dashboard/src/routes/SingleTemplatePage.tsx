import { Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Box, Typography } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import {
  WorkflowsNavbar,
  TemplateViewRetrigger,
  TemplateView,
} from "relay-workflows-lib";
import { splitWorkflowId, WorkflowErrorBoundaryWithRetry } from "workflows-lib";
import { tidyPath } from "./utils";

const SingleTemplatePage: React.FC = () => {
  const { templateName, prepopulate } = useParams<{
    templateName: string;
    prepopulate?: string; // workflowId to use for prepopulation of parameters
  }>();

  const { visit, workflowName, uid } = splitWorkflowId(prepopulate) ?? {
    visit: undefined,
  };

  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs
        path={tidyPath(window.location.pathname, true)}
        linkComponent={Link}
      />
      <Container maxWidth="xl">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          mt={2}
          mb={10}
        >
          {templateName && (
            <WorkflowErrorBoundaryWithRetry>
              {({ fetchKey }) => (
                <Suspense
                  key={`template-${JSON.stringify(prepopulate)}-${JSON.stringify(fetchKey)}`}
                  fallback={
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Loading Template...
                      </Typography>
                    </Box>
                  }
                >
                  {workflowName && uid && prepopulate ? (
                    <TemplateViewRetrigger
                      templateName={templateName}
                      workflowId={prepopulate}
                      visit={visit}
                    />
                  ) : (
                    <TemplateView templateName={templateName} visit={visit} />
                  )}
                </Suspense>
              )}
            </WorkflowErrorBoundaryWithRetry>
          )}
        </Box>
      </Container>
    </>
  );
};

export default SingleTemplatePage;
