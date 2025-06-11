import React from "react";
import Tooltip from "@mui/material/Tooltip";
import RefreshIcon from "@mui/icons-material/Refresh";
import { graphql } from "relay-runtime";
import { useLazyLoadQuery } from "react-relay/hooks";
import { NavLink } from "react-router-dom";
import { RetriggerWorkflowQuery as RetriggerWorkflowQueryType } from "./__generated__/RetriggerWorkflowQuery.graphql";
import { Visit, visitToText } from "@diamondlightsource/sci-react-ui";
import WorkflowsErrorBoundary from "workflows-lib/lib/components/workflow/WorkflowsErrorBoundary";
const retriggerWorkflowQuery = graphql`
  query RetriggerWorkflowQuery($visit: VisitInput!, $workflowname: String!) {
    workflow(visit: $visit, name: $workflowname) {
      templateRef
    }
  }
`;

const NoTemplateIcon: React.FC = () => {
  return (
    <Tooltip title="No template found">
      <RefreshIcon sx={{ color: "lightgrey" }} />
    </Tooltip>
  );
};

interface RetriggerWorkflowProps {
  instrumentSession: Visit;
  workflowName: string;
}

const RetriggerWorkflowBase: React.FC<RetriggerWorkflowProps> = ({
  instrumentSession,
  workflowName,
}) => {
  const data = useLazyLoadQuery<RetriggerWorkflowQueryType>(
    retriggerWorkflowQuery,
    {
      visit: instrumentSession,
      workflowname: workflowName,
    },
  );

  const templateName = data.workflow.templateRef;

  return templateName ? (
    <NavLink
      title="Rerun workflow"
      to={`/templates/${templateName}/${visitToText(
        instrumentSession,
      )}-${workflowName}`}
    >
      <RefreshIcon />
    </NavLink>
  ) : (
    <NoTemplateIcon />
  );
};

const RetriggerWorkflow: React.FC<RetriggerWorkflowProps> = (props) => (
  <WorkflowsErrorBoundary fallback={<NoTemplateIcon />}>
    <RetriggerWorkflowBase {...props} />
  </WorkflowsErrorBoundary>
);

export default RetriggerWorkflow;
