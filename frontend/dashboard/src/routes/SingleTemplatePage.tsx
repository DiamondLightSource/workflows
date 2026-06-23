import { Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Box, Typography } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import {
  WorkflowsNavbar,
  TemplateViewRetrigger,
  TemplateView,
} from "relay-workflows-lib";
import {
  parseVisitAndTemplate,
  WorkflowErrorBoundaryWithRetry,
} from "workflows-lib";

const SingleTemplatePage: React.FC = () => {
  const { templateName, prepopulate } = useParams<{
    templateName: string;
    prepopulate?: string;
  }>();

  const [visit, workflowName] = parseVisitAndTemplate(prepopulate ?? "") ?? [
    undefined,
    undefined,
  ];

  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
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
                  key={`template-${JSON.stringify(workflowName)}-${JSON.stringify(fetchKey)}`}
                  fallback={
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Loading Template...
                      </Typography>
                    </Box>
                  }
                >
                  {workflowName ? (
                    <TemplateViewRetrigger
                      templateName={templateName}
                      workflowName={workflowName}
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
