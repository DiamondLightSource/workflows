import React from "react";
import Tooltip from "@mui/material/Tooltip";
import RefreshIcon from "@mui/icons-material/Refresh";
import { graphql } from "relay-runtime";
import { useLazyLoadQuery } from "react-relay";
import { NavLink } from "react-router-dom";
import { RetriggerWorkflowQuery as RetriggerWorkflowQueryType } from "./__generated__/RetriggerWorkflowQuery.graphql";
import { WorkflowsErrorBoundary } from "workflows-lib";

const retriggerWorkflowQuery = graphql`
  query RetriggerWorkflowQuery($id: ID!) {
    workflowById(id: $id) {
      templateRef
      id
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
  workflowId: string;
}

const RetriggerWorkflowBase: React.FC<RetriggerWorkflowProps> = ({
  workflowId,
}) => {
  const data = useLazyLoadQuery<RetriggerWorkflowQueryType>(
    retriggerWorkflowQuery,
    {
      id: workflowId,
    },
  );

  const templateName = data.workflowById?.templateRef;

  return templateName ? (
    <Tooltip title="Rerun workflow">
      <NavLink to={`/templates/${templateName}/${workflowId}`}>
        <RefreshIcon />
      </NavLink>
    </Tooltip>
  ) : (
    <NoTemplateIcon />
  );
};

export const RetriggerWorkflow: React.FC<RetriggerWorkflowProps> = (props) => (
  <WorkflowsErrorBoundary fallback={<NoTemplateIcon />}>
    <RetriggerWorkflowBase {...props} />
  </WorkflowsErrorBoundary>
);

export default RetriggerWorkflow;
