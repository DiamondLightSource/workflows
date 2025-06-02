import { useParams, NavLink } from "react-router-dom";
import { Container, Box, Typography } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import TemplateView from "relay-workflows-lib/lib/components/TemplateView";
import TemplateViewRetrigger from "relay-workflows-lib/lib/components/TemplateViewRetrigger";

import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";
import { Suspense } from "react";
import {
  parseVisitAndTemplate,
  visitToText,
} from "workflows-lib/lib/utils/commonUtils";

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
      <Breadcrumbs path={window.location.pathname} />
      <Container maxWidth="xl">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          mt={2}
          mb={10}
        >
          {workflowName && (
            <Typography align="center" mb={5}>
              Using initial parameters from{" "}
              <NavLink to={`/workflows/${visitToText(visit)}/${workflowName}`}>
                {workflowName}
              </NavLink>
            </Typography>
          )}
          {templateName && (
            <WorkflowsErrorBoundary>
              <Suspense>
                {workflowName ? (
                  <TemplateViewRetrigger
                    templateName={templateName}
                    workflowName={workflowName}
                    visit={visit}
                  />
                ) : (
                  <TemplateView templateName={templateName} />
                )}
              </Suspense>
            </WorkflowsErrorBoundary>
          )}
        </Box>
      </Container>
    </>
  );
};

export default SingleTemplatePage;
